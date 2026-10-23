import unicodedata
import re

def clean_text_for_sms(text: str) -> str:
    """Removes accents, non-ASCII characters, and keeps plain single-line SMS compatible text."""
    if not text:
        return ""
    # Normalize unicode (e.g. ñ -> n, é -> e)
    normalized = unicodedata.normalize('NFKD', text)
    ascii_text = normalized.encode('ASCII', 'ignore').decode('ASCII')
    # Replace any newlines or tabs with a single space
    cleaned = re.sub(r'[\r\n\t]+', ' ', ascii_text)
    # Collapse multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def format_registration_sms(code: str) -> str:
    """
    Hi-Vet: Your verification code is {code}. It expires in 10 minutes. Do not share this code with anyone.
    """
    msg = f"Hi-Vet: Your verification code is {code}. It expires in 10 minutes. Do not share this code with anyone."
    return msg[:160]

def format_customer_registration_sms(first_name: str | None, last_name: str | None, code: str) -> str:
    """
    Hello {First} {Last}! Your Hi-Vet verification code is {code}. It expires in 10 minutes. Do not share this code with anyone.
    Falls back to a first-name or no-name greeting if the full name is missing or too long to fit in one SMS (160 chars).
    """
    full_name = clean_text_for_sms(f"{first_name or ''} {last_name or ''}")
    body = f"Your Hi-Vet verification code is {code}. It expires in 10 minutes. Do not share this code with anyone."
    msg = f"Hello {full_name}! {body}" if full_name else f"Hello! {body}"
    if len(msg) > 160:
        first_only = clean_text_for_sms(first_name or "")
        msg = f"Hello {first_only}! {body}" if first_only else f"Hello! {body}"
    if len(msg) > 160:
        msg = f"Hello! {body}"
    return msg[:160]

def format_forgot_password_sms(code: str) -> str:
    """
    Hi-Vet: Your password reset code is {code}. It expires in 10 minutes. If you did not ask for this, ignore this message.
    """
    msg = f"Hi-Vet: Your password reset code is {code}. It expires in 10 minutes. If you did not ask for this, ignore this message."
    return msg[:160]

def format_customer_forgot_password_sms(first_name: str | None, last_name: str | None, code: str) -> str:
    """
    Hello {First} {Last}! Your Hi-Vet password reset code is {code}. It expires in 10 minutes. Do not share this code with anyone.
    Falls back to a no-name greeting if the name is missing or too long to fit in one SMS (160 chars).
    """
    full_name = clean_text_for_sms(f"{first_name or ''} {last_name or ''}")
    body = f"Your Hi-Vet password reset code is {code}. It expires in 10 minutes. Do not share this code with anyone."
    msg = f"Hello {full_name}! {body}" if full_name else f"Hello! {body}"
    if len(msg) > 160:
        first_only = clean_text_for_sms(first_name or "")
        msg = f"Hello {first_only}! {body}" if first_only else f"Hello! {body}"
    if len(msg) > 160:
        msg = f"Hello! {body}"
    return msg[:160]

def format_order_receipt_sms(first_name: str | None, total_amount: float, order_number: str) -> str:
    """
    Hi-Vet: Thank you, {first name}! We received your payment of PHP {total} for order {order number}. Keep this as your receipt.
    Or if first name missing:
    Hi-Vet: Thank you! We received your payment of PHP {total} for order {order number}. Keep this as your receipt.
    """
    cleaned_name = clean_text_for_sms(first_name) if first_name else ""
    cleaned_order_num = clean_text_for_sms(order_number)
    formatted_total = f"{total_amount:,.2f}"

    if cleaned_name:
        # If long name causes overflow, truncate name to first 15 characters
        if len(cleaned_name) > 15:
            cleaned_name = cleaned_name[:15].strip()
        msg = f"Hi-Vet: Thank you, {cleaned_name}! We received your payment of PHP {formatted_total} for order {cleaned_order_num}. Keep this as your receipt."
    else:
        msg = f"Hi-Vet: Thank you! We received your payment of PHP {formatted_total} for order {cleaned_order_num}. Keep this as your receipt."

    # If somehow still > 160, ensure it strictly fits within 160 without cutting amount or order number
    if len(msg) > 160:
        # Fallback to no-name variant
        msg = f"Hi-Vet: Thank you! We received your payment of PHP {formatted_total} for order {cleaned_order_num}. Keep this as your receipt."

    return msg[:160]
