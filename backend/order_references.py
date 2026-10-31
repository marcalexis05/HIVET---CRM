"""Public order labels; database IDs and pickup serials stay unchanged."""
from datetime import datetime, timezone
import re


def format_order_reference(order):
    created_at = getattr(order, "created_at", None)
    if created_at is not None:
        # Match the suffix used by the existing clinic order reference exactly.
        suffix = int(created_at.timestamp()) % 10000
        year = created_at.year
    else:
        suffix = int(order.id) % 10000
        year = datetime.now(timezone.utc).year
    return f"HV-{year}-{suffix:04d}"


def compact_order_references_in_text(value):
    return re.sub(r"\bHV-(\d{4})-\d+-([0-9]{4})\b", r"HV-\1-\2", value or "")


def mask_pickup_serial(value):
    return re.sub(r"[0-9]", "*", value or "")
