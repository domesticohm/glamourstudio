"""
face_processor.py
-----------------
InsightFace-based face detection.
Returns ArcFace 512-dim embedding + 5-point facial keypoints for InstantID.
"""
from __future__ import annotations

import base64
import io
import logging

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_app = None


def _get_face_app():
    global _app
    if _app is None:
        import insightface
        logger.info("Loading InsightFace buffalo_l …")
        _app = insightface.app.FaceAnalysis(
            name="buffalo_l",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        _app.prepare(ctx_id=0, det_size=(640, 640))
        logger.info("InsightFace loaded.")
    return _app


def process_face(img: Image.Image) -> dict:
    """
    Detect the primary (largest) face in the image.

    Returns:
        embedding     – 512-dim ArcFace float list
        keypoints     – [[x,y], …] × 5 in source-image coordinates
        bbox          – [x1, y1, x2, y2] in source-image coordinates
        src_size      – [width, height] of the input image
        face_crop_b64 – base64 PNG thumbnail of the detected face
        confidence    – detection confidence score
    """
    app = _get_face_app()
    img_rgb = np.array(img.convert("RGB"))
    faces = app.get(img_rgb)

    if not faces:
        raise ValueError(
            "No face detected. Please upload a photo where your face is clearly visible."
        )

    # Use the largest face by bounding-box area
    face = max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
    )

    embedding  = face.embedding.tolist()
    keypoints  = face.kps.tolist()
    bbox       = face.bbox.tolist()
    confidence = float(face.det_score)

    # Build a padded face crop for the UI preview
    x1, y1, x2, y2 = [int(v) for v in bbox]
    pad = int((y2 - y1) * 0.2)
    x1c = max(0, x1 - pad)
    y1c = max(0, y1 - pad)
    x2c = min(img_rgb.shape[1], x2 + pad)
    y2c = min(img_rgb.shape[0], y2 + pad)
    crop = Image.fromarray(img_rgb[y1c:y2c, x1c:x2c])
    crop.thumbnail((256, 256))
    buf = io.BytesIO()
    crop.save(buf, format="PNG")
    face_crop_b64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "embedding":     embedding,
        "keypoints":     keypoints,
        "bbox":          bbox,
        "src_size":      [img.width, img.height],
        "face_crop_b64": face_crop_b64,
        "confidence":    confidence,
    }
