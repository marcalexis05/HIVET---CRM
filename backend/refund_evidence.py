"""Private, order-bound product photos for return/refund evidence."""
import re
import uuid
from fastapi import HTTPException
import delivery_proofs


def evidence_url(order_id, filename):
    return f"/api/orders/{order_id}/refund-photo/{filename}"


def evidence_path(customer_id, order_id, url):
    prefix = f"/api/orders/{order_id}/refund-photo/"
    if not isinstance(url, str) or not url.startswith(prefix):
        return None
    name = url[len(prefix):]
    if not re.fullmatch(rf"refund_{customer_id}_{order_id}_[0-9a-f]{{32}}\.jpg", name):
        return None
    path = delivery_proofs.PROOF_DIR / "refunds" / name
    return path if path.is_file() else None


def save_evidence(customer_id, order_id, content):
    jpeg = delivery_proofs.validated_proof_jpeg(content)
    directory = delivery_proofs.PROOF_DIR / "refunds"
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"refund_{customer_id}_{order_id}_{uuid.uuid4().hex}.jpg"
    (directory / filename).write_bytes(jpeg)
    return evidence_url(order_id, filename)


def validate_evidence(customer_id, order_id, photos):
    if not isinstance(photos, list) or not 1 <= len(photos) <= 4 or len(set(photos)) != len(photos):
        raise HTTPException(400, "Upload one to four different photos of the supply for this refund request.")
    if any(not evidence_path(customer_id, order_id, url) for url in photos):
        raise HTTPException(400, "Use supply photos uploaded for this order. Please upload the photos again.")
