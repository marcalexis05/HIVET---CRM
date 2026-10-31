"""Validate delivery images and keep evidence outside the public uploads mount."""
import io
import os
from pathlib import Path
import re
import uuid
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException

MAX_PROOF_BYTES = 8 * 1024 * 1024
PROOF_DIR = Path(os.getenv("HIVET_DELIVERY_PROOF_DIR", str(Path(__file__).resolve().parent / "private_delivery_proofs")))


def proof_path(delivery):
    name = delivery.proof_of_delivery_url or ""
    if not re.fullmatch(rf"delivery_{delivery.id}_[0-9a-f]{{32}}\.jpg", name):
        return None
    path = PROOF_DIR / name
    return path if path.is_file() else None


def validated_proof_jpeg(content):
    if not content or len(content) > MAX_PROOF_BYTES:
        raise HTTPException(400, "Upload a delivery photo smaller than 8 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"} or getattr(image, "is_animated", False):
                    raise ValueError("Unsupported image")
                if min(image.size) < 200 or image.width * image.height > 20_000_000:
                    raise ValueError("Image dimensions")
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((2048, 2048))
                output = io.BytesIO()
                image.save(output, "JPEG", quality=88)
                return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(400, "Use a valid JPG, PNG or WebP photo, at least 200 pixels on each side.")


def write_proof(delivery, content):
    jpeg = validated_proof_jpeg(content)
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    name = f"delivery_{delivery.id}_{uuid.uuid4().hex}.jpg"
    path = PROOF_DIR / name
    path.write_bytes(jpeg)
    return name, path


def delivery_proof_url(delivery):
    if not delivery or not proof_path(delivery):
        return None
    return f"/api/deliveries/{delivery.id}/proof"
