"""
generator.py
------------
InstantID portrait generation.
  - SDXL base + InstantX ControlNet (facial keypoints)
  - InstantX IP-Adapter (face identity embedding)
  - DPM++ 2M, 20 steps — targets ~30-50 s on RTX 4070 Laptop
"""
from __future__ import annotations

import io
import logging
import math
from typing import Callable, Optional

import cv2
import numpy as np
import torch
from PIL import Image

logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────

BASE_MODEL_ID        = "stabilityai/stable-diffusion-xl-base-1.0"
VAE_MODEL_ID         = "madebyollin/sdxl-vae-fp16-fix"
INSTANTID_REPO       = "InstantX/InstantID"
IP_WEIGHT_NAME       = "ip-adapter.bin"
CONTROLNET_SUBFOLDER = "ControlNetModel"

PORTRAIT_W = 832
PORTRAIT_H = 1024
NUM_STEPS  = 20
CFG_SCALE  = 7.0
IP_SCALE   = 0.8
CN_SCALE   = 0.8

POSITIVE_PROMPT = (
    "vintage 1970s 1980s studio double-exposure portrait photograph, "
    "subject seated naturally posed, waist-up view, retro clothing, "
    "large semi-transparent close-up face softly overlaid in background, "
    "feathered edges, smooth opacity blending, "
    "warm amber golden brown tones, soft studio lighting, "
    "slightly dramatic shadows, subtle bloom glow effect, "
    "dark brown maroon gradient studio backdrop, "
    "subject slightly off-center, nostalgic dreamy atmosphere, "
    "subtle film grain, slight vignette, "
    "photorealistic, highly detailed, sharp focus on primary subject"
)

NEGATIVE_PROMPT = (
    "deformed, distorted, disfigured, bad anatomy, extra limbs, "
    "cartoon, anime, painting, sketch, blurry, low quality, "
    "watermark, text, signature, modern photography, harsh lighting, "
    "overexposed, underexposed, multiple faces"
)

# ─── Singleton ────────────────────────────────────────────────────────────────

_pipeline = None


def _get_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


# ─── Keypoint utilities ───────────────────────────────────────────────────────

def _draw_kps(w: int, h: int, kps: np.ndarray) -> Image.Image:
    """Render 5-point facial keypoints on a black canvas (InstantID format)."""
    limb_seq = [[0, 2], [1, 2], [3, 2], [4, 2]]
    colors   = [
        (255, 0, 0),    # left eye
        (0, 255, 0),    # right eye
        (0, 0, 255),    # nose
        (255, 255, 0),  # left mouth
        (255, 0, 255),  # right mouth
    ]
    stickwidth = 4
    out = np.zeros([h, w, 3], dtype=np.uint8)

    for i, (a, b) in enumerate(limb_seq):
        x = [float(kps[a][0]), float(kps[b][0])]
        y = [float(kps[a][1]), float(kps[b][1])]
        length = math.sqrt((x[0] - x[1]) ** 2 + (y[0] - y[1]) ** 2)
        angle  = math.degrees(math.atan2(y[0] - y[1], x[0] - x[1]))
        mx, my = int((x[0] + x[1]) / 2), int((y[0] + y[1]) / 2)
        poly   = cv2.ellipse2Poly(
            (mx, my), (max(1, int(length / 2)), stickwidth), int(angle), 0, 360, 1
        )
        cv2.fillConvexPoly(out, poly, colors[i])

    out = (out * 0.6).astype(np.uint8)
    for idx, (kx, ky) in enumerate(kps):
        cv2.circle(out, (int(kx), int(ky)), 10, colors[idx], -1)

    return Image.fromarray(out)


def make_pose_image(
    kps_src: list[list[float]],
    bbox_src: list[float],
) -> Image.Image:
    """
    Transform source-image keypoints onto the target portrait canvas.
    Scales so the detected face occupies ~45 % of portrait height,
    centered horizontally, positioned at ~40 % from the top.
    """
    x1, y1, x2, y2 = bbox_src
    src_face_h = max(y2 - y1, 1)

    scale  = (PORTRAIT_H * 0.45) / src_face_h
    cx_src = (x1 + x2) / 2
    cy_src = (y1 + y2) / 2
    dx     = PORTRAIT_W / 2 - cx_src * scale
    dy     = PORTRAIT_H * 0.40 - cy_src * scale

    kps = np.array(kps_src, dtype=np.float32)
    kps[:, 0] = kps[:, 0] * scale + dx
    kps[:, 1] = kps[:, 1] * scale + dy

    return _draw_kps(PORTRAIT_W, PORTRAIT_H, kps)


# ─── Pipeline ─────────────────────────────────────────────────────────────────

def get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline

    from diffusers import (
        AutoencoderKL,
        ControlNetModel,
        DPMSolverMultistepScheduler,
        StableDiffusionXLControlNetPipeline,
    )

    device = _get_device()
    dtype  = torch.float16 if device == "cuda" else torch.float32

    logger.info("Loading fp16 VAE …")
    vae = AutoencoderKL.from_pretrained(VAE_MODEL_ID, torch_dtype=dtype)

    logger.info("Loading InstantID ControlNet …")
    controlnet = ControlNetModel.from_pretrained(
        INSTANTID_REPO,
        subfolder=CONTROLNET_SUBFOLDER,
        torch_dtype=dtype,
    )

    scheduler = DPMSolverMultistepScheduler(
        num_train_timesteps=1000,
        beta_start=0.00085,
        beta_end=0.012,
        beta_schedule="scaled_linear",
        algorithm_type="dpmsolver++",
        solver_order=2,
    )

    logger.info("Loading SDXL base pipeline …")
    pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
        BASE_MODEL_ID,
        vae=vae,
        controlnet=controlnet,
        torch_dtype=dtype,
        scheduler=scheduler,
        add_watermarker=False,
    )

    # Component-level CPU offload: text encoders and VAE go to CPU when not
    # needed; UNet + ControlNet stay on GPU for the entire denoising loop.
    # Do NOT call pipe.to("cuda") first — enable_model_cpu_offload manages placement.
    pipe.enable_model_cpu_offload()
    pipe.enable_attention_slicing()

    logger.info("Loading InstantID IP-Adapter …")
    pipe.load_ip_adapter(
        INSTANTID_REPO,
        subfolder=None,
        weight_name=IP_WEIGHT_NAME,
        image_encoder_folder=None,  # FaceID uses raw embeddings, not CLIP
    )
    pipe.set_ip_adapter_scale(IP_SCALE)

    logger.info("Pipeline ready.")
    _pipeline = pipe
    return _pipeline


# ─── Public API ───────────────────────────────────────────────────────────────

def generate_portrait(
    face_embedding: list[float],
    kps_src: list[list[float]],
    bbox_src: list[float],
    seed: int = 42,
    progress_cb: Optional[Callable] = None,
) -> Image.Image:
    already_loaded = _pipeline is not None

    if progress_cb:
        msg = "Pipeline ready — starting …" if already_loaded else "Loading models into GPU memory …"
        progress_cb(msg, 20)

    pipe = get_pipeline()
    device = _get_device()
    dtype  = torch.float16 if device == "cuda" else torch.float32

    if progress_cb:
        progress_cb("Preparing face conditioning …", 38)

    # Build face embedding tensor — CFG needs [uncond, cond] → shape [2, 1, 512]
    emb = np.array(face_embedding, dtype=np.float32)
    emb /= np.linalg.norm(emb) + 1e-8
    face_t = torch.from_numpy(emb).unsqueeze(0).unsqueeze(0).to(device, dtype=dtype)
    image_embeds = [torch.cat([torch.zeros_like(face_t), face_t], dim=0)]

    # Build the keypoint pose image for ControlNet
    pose_img = make_pose_image(kps_src, bbox_src)

    generator = torch.Generator(device=device).manual_seed(seed)

    def step_cb(pipe, step_index, timestep, callback_kwargs):
        if progress_cb:
            pct = 42 + int((step_index + 1) / NUM_STEPS * 50)
            progress_cb(f"Diffusion step {step_index + 1}/{NUM_STEPS} …", pct)
        return callback_kwargs

    if progress_cb:
        progress_cb("Running diffusion steps …", 42)

    result = pipe(
        prompt=POSITIVE_PROMPT,
        negative_prompt=NEGATIVE_PROMPT,
        image=pose_img,
        controlnet_conditioning_scale=CN_SCALE,
        ip_adapter_image_embeds=image_embeds,
        num_inference_steps=NUM_STEPS,
        guidance_scale=CFG_SCALE,
        height=PORTRAIT_H,
        width=PORTRAIT_W,
        generator=generator,
        callback_on_step_end=step_cb,
    )

    return result.images[0]


def image_to_bytes(img: Image.Image, fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()
