"""
gemini_pipeline.py
------------------
Three-phase portrait generation using Google Gemini:

  Phase 1  gemini-2.5-flash        → analyze uploaded face photo
  Phase 2  gemini-2.5-flash-image  → generate double-exposure portrait
  Phase 3  gemini-2.5-flash        → verify likeness; retry once if poor
"""
from __future__ import annotations

import base64
import io
import logging
import os
from typing import Callable, Optional

from PIL import Image

logger = logging.getLogger(__name__)

ANALYSIS_MODEL     = "gemini-2.5-flash"
GENERATION_MODEL   = "gemini-3.1-flash-image-preview"
VERIFICATION_MODEL = "gemini-2.5-flash"

STYLE_PROMPT = """\
Create a photorealistic 1970s–1980s studio portrait photograph of the person \
in the reference photo, composed exactly like a classic double-exposure \
yearbook or promotional portrait from that era.

COMPOSITION — follow this layout precisely:
- PRIMARY SUBJECT: the person shown chest-to-waist-up, positioned LEFT of \
center, body turned slightly inward. Wearing authentic 1970s–80s clothing \
(patterned cardigan, collared polo, or button-up shirt with tie).
- BACKGROUND FACE: a close-up of the SAME person's face filling \
the RIGHT side and upper portion of the frame. The face is roughly \
1.2–1.5× the size of the subject's head. It is slightly translucent — \
rendered at roughly 70–75% opacity so the dark background subtly shows \
through it, giving a soft, ghosted quality without looking fully solid. \
Edges fade naturally into the dark backdrop with no hard cutoff.
- The background face must show a SLIGHTLY HAPPIER expression than the \
foreground subject — a warm, relaxed smile or soft pleased expression, \
as if caught in a candid moment.
- Both figures must unmistakably be the same person.

BACKGROUND:
- Very deep, near-black dark brown studio backdrop
- No visible texture or gradient — pure dark studio void
- The background face fades naturally into this darkness at its edges

LIGHTING & COLOR:
- Warm, desaturated amber/sepia/brown color grade — looks like a faded \
color photograph from the 1970s
- Soft studio key light on the subject, slightly dramatic side shadow
- The background face lit from a similar warm source
- Subtle film grain throughout
- Slight vignette at corners

OUTPUT:
- Portrait orientation (4:5 ratio)
- Photorealistic, high resolution
- Looks like a real scanned studio photo from 1975–1985, not digital art

CRITICAL: The person's face, skin tone, hair, and likeness must exactly match \
the reference photo for BOTH the foreground subject and the large background face.

EXPRESSION: The foreground subject's facial expression must closely mirror the \
expression in the uploaded reference photo — preserve their natural look, \
whether relaxed, smiling, or neutral. Do NOT make the subject look stern, \
stiff, or overly serious unless that matches the reference photo.\
"""

ANALYSIS_PROMPT = """\
Analyze the person's face in this photo in precise detail. Describe:
- Exact facial structure (face shape, jawline, cheekbones)
- Eyes (color, shape, size, eyebrows)
- Nose (shape, size)
- Mouth and lips (shape, fullness)
- Skin tone and texture
- Hair (color, texture, style, length)
- Any distinctive features (freckles, dimples, etc.)
- Age range and gender presentation
- Facial expression: describe it precisely (e.g. relaxed slight smile, \
neutral soft gaze, warm open expression, etc.)

Be very specific — this description will be used to reproduce their likeness \
and expression accurately.\
"""

VERIFICATION_PROMPT = """\
Compare the generated portrait to the original reference photo.
Does the person in the portrait look like the same individual as in the reference photo?
Specifically check: face shape, skin tone, eye color/shape, nose, lips, hair.

Reply with ONLY: PASS or FAIL followed by one sentence explanation.\
"""


def _get_client():
    from google import genai
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set. "
            "Get a key at https://aistudio.google.com/apikey"
        )
    return genai.Client(api_key=api_key)


def _image_to_part(img: Image.Image):
    from google.genai import types
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg")


def _generate_portrait_image(
    client,
    face_description: str,
    reference_img: Image.Image,
    style_prompt: str = "",
) -> Image.Image:
    from google.genai import types

    prompt = (
        f"Reference person description:\n{face_description}\n\n"
        f"{style_prompt or STYLE_PROMPT}"
    )

    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=[
            prompt,
            _image_to_part(reference_img),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            data = part.inline_data.data
            # SDK may return raw bytes or a base64 string depending on version
            if isinstance(data, str):
                data = base64.b64decode(data)
            return Image.open(io.BytesIO(data)).convert("RGB")

    raise RuntimeError("Gemini did not return an image in Phase 2.")


SCHOOL_PHOTO_ADDON = """

OVERRIDE STYLE — THIS IS A 1990s SCHOOL PORTRAIT, NOT A DOUBLE-EXPOSURE:
Ignore the double-exposure composite instructions above. Instead produce a \
single, classic 1990s school portrait photograph with these exact qualities:

BACKGROUND: Mottled blue, grey, and purple laser-streak studio backdrop — \
the iconic Olan Mills / Lifetouch style. Alternatively a soft-focus textured \
muslin in those same cool tones.

LIGHTING: Flat, high-key department-store flash photography. Slight \
overexposure on the forehead and cheeks. Even, shadowless fill light with \
a subtle catchlight in each eye.

COMPOSITION: Classic school portrait framing — chest-up, subject looking \
directly into the lens, slightly stiff upright posture. No background face \
overlay. Single subject only.

CLOTHING: Dress the subject in authentic early-to-mid 1990s American school \
style. Choose from: oversized flannel shirt, polo with collar up, graphic \
tee, denim jacket, chunky knit sweater, color-blocked top, or neon/primary \
color shirt. Patterns should be geometric prints, color blocking, subtle \
tie-dye, or bold solids (neon green, hot pink, orange, red, blue, yellow).

HAIR — pick one style based on the person's gender presentation:
- Masculine/boys: MUST choose one of these three — a clean rounded bowl cut, \
a spiked flat top (hair standing straight up, flat across the top, gelled), \
or a mullet (short on sides and front, noticeably longer in the back). \
Do not use any other hairstyle for males.
- Feminine/girls: high ponytail with oversized scrunchie, side ponytail, \
crimped zig-zag textured hair, feathered swooped bangs, chin-length bob, \
half-up half-down style, or braids with colorful ties.

ACCESSORIES: Add one or two era-accurate accessories — oversized bright \
scrunchie, slap bracelet, plastic charm necklace, fanny pack, \
forward or backward baseball cap, or tiny backpack strap visible at shoulder. \
Everything must look genuinely period-accurate to 1990–1997 American school photos.

AESTHETIC: Soft lens diffusion (slight glow/halation), subtle film grain, \
1990s color grading (warm golden shadows, slightly muted/desaturated \
midtones), matte finish appearance as if printed on school photo paper.

IDENTITY: The person in the output must look EXACTLY like the person in the \
reference photo — same face, skin tone, hair, and features. Only the style \
and setting change.\
"""


def _get_style_prompt(vibe: str) -> str:
    if vibe == "school":
        return STYLE_PROMPT + SCHOOL_PHOTO_ADDON
    return STYLE_PROMPT


def generate_portrait(
    photo: Image.Image,
    vibe: str = "glamour",
    progress_cb: Optional[Callable[[str, int], None]] = None,
) -> Image.Image:
    """
    Full 3-phase pipeline.
    vibe: 'glamour' (default) or 'school'
    Returns the generated portrait as a PIL Image.
    """
    client = _get_client()
    style_prompt = _get_style_prompt(vibe)

    # ── Phase 1: Analyze ──────────────────────────────────────────────────────
    if progress_cb:
        progress_cb("Phase 1 — Analyzing your face…", 15)

    logger.info("Phase 1: face analysis")
    from google.genai import types

    analysis_response = client.models.generate_content(
        model=ANALYSIS_MODEL,
        contents=[ANALYSIS_PROMPT, _image_to_part(photo)],
    )
    face_description = analysis_response.text.strip()
    logger.info("Phase 1 complete. Description length: %d chars", len(face_description))

    # ── Phase 2: Generate ─────────────────────────────────────────────────────
    if progress_cb:
        progress_cb("Phase 2 — Generating portrait…", 40)

    logger.info("Phase 2: portrait generation (attempt 1)")
    portrait = _generate_portrait_image(client, face_description, photo, style_prompt)

    # ── Phase 3: Verify ───────────────────────────────────────────────────────
    if progress_cb:
        progress_cb("Phase 3 — Verifying likeness…", 85)

    logger.info("Phase 3: likeness verification")
    verify_response = client.models.generate_content(
        model=VERIFICATION_MODEL,
        contents=[
            VERIFICATION_PROMPT,
            _image_to_part(photo),
            _image_to_part(portrait),
        ],
    )
    verdict = verify_response.text.strip()
    logger.info("Phase 3 verdict: %s", verdict)

    if verdict.upper().startswith("FAIL"):
        # One retry with a stronger identity prompt
        if progress_cb:
            progress_cb("Refining portrait to better match your face…", 88)
        logger.info("Phase 3 FAIL — retrying generation")
        stronger_prompt = (
            f"IMPORTANT: The portrait must look EXACTLY like this specific person.\n"
            f"Reference description:\n{face_description}\n\n"
            f"{style_prompt}\n\n"
            f"Pay special attention to matching: face shape, skin tone, eye color, "
            f"nose shape, and hair exactly as in the reference photo."
        )
        portrait = _generate_portrait_image(client, stronger_prompt, photo, style_prompt)

    if progress_cb:
        progress_cb("Done!", 100)

    return portrait


def image_to_bytes(img: Image.Image, fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()
