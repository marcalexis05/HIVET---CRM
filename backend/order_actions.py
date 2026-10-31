"""Customer receipt/refund window without changing fulfillment statuses."""
from datetime import datetime, timedelta, timezone


def customer_action_window(order, now=None):
    completed = order.status in {"Completed", "Delivered"}
    completed_at = order.delivered_at or order.created_at
    if completed_at and completed_at.tzinfo is not None:
        completed_at = completed_at.astimezone(timezone.utc).replace(tzinfo=None)
    now = now or datetime.utcnow()
    if now.tzinfo is not None:
        now = now.astimezone(timezone.utc).replace(tzinfo=None)
    deadline = completed_at + timedelta(hours=72) if completed and completed_at else None
    expired = bool(completed and (deadline is None or now >= deadline))
    return {
        "customer_action_deadline": deadline.isoformat() + "Z" if deadline else None,
        "customer_action_expired": expired,
        "can_request_return": completed and not expired and not order.return_status,
    }
