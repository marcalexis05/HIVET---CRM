import os
import re
import datetime
import requests
from typing import Optional, Dict, Any

def normalize_ph_phone(phone: str) -> Optional[str]:
    """
    Normalizes Filipino phone formats into international E.164 (+639XXXXXXXXX):
    - 09171234567 -> +639171234567
    - 9171234567  -> +639171234567
    - +639171234567 -> +639171234567
    - 639171234567  -> +639171234567
    Returns None if the phone number is not a valid Philippine mobile number.
    """
    if not phone:
        return None
    # Strip any non-digit characters except leading plus
    raw = phone.strip()
    digits_only = re.sub(r'[^\d]', '', raw)

    if len(digits_only) == 10 and digits_only.startswith('9'):
        return f"+63{digits_only}"
    elif len(digits_only) == 11 and digits_only.startswith('09'):
        return f"+63{digits_only[1:]}"
    elif len(digits_only) == 12 and digits_only.startswith('639'):
        return f"+{digits_only}"
    elif raw.startswith('+63') and len(digits_only) == 12 and digits_only.startswith('639'):
        return f"+{digits_only}"

    return None

def mask_phone(phone: str) -> str:
    """Partially hides phone number for logs and privacy (e.g. +63917***4567)."""
    norm = normalize_ph_phone(phone) or phone.strip()
    if len(norm) >= 8:
        return f"{norm[:6]}***{norm[-4:]}"
    return "***"

def is_sms_enabled() -> bool:
    val = os.getenv("SMS_ENABLED", "False").strip().lower()
    return val in ("true", "1", "yes", "on")

_CACHED_DEVICE_ID: Optional[str] = None

def _resolve_textbee_device_id(base_url: str, headers: Dict[str, str]) -> Optional[str]:
    """Looks up the first enabled TextBee device linked to the API key (cached)."""
    global _CACHED_DEVICE_ID
    if _CACHED_DEVICE_ID:
        return _CACHED_DEVICE_ID
    try:
        resp = requests.get(f"{base_url}/gateway/devices", headers=headers, timeout=10)
        if resp.status_code == 200:
            devices = (resp.json() or {}).get("data", []) or []
            for d in devices:
                if d.get("enabled", True) and d.get("_id"):
                    _CACHED_DEVICE_ID = d["_id"]
                    return _CACHED_DEVICE_ID
    except Exception:
        pass
    return None

def send_sms(phone: str, message: str, purpose: str = "general") -> Dict[str, Any]:
    """
    Sends an SMS via TextBee Android Gateway API.
    Does not crash on failure. Never logs the API key or full message content.
    """
    normalized = normalize_ph_phone(phone)
    masked = mask_phone(phone if phone else "None")
    now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    if not normalized:
        print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | Invalid Philippine phone number")
        return {"success": False, "error": "Invalid phone number format"}

    # Check test / development mode switch
    if not is_sms_enabled():
        print(f"[SMS TEST MODE] {now_iso} | {purpose} | {masked} | Message: {message}")
        return {"success": True, "test_mode": True, "masked_phone": masked}

    api_key = os.getenv("TEXTBEE_API_KEY", "").strip()
    device_id = os.getenv("TEXTBEE_DEVICE_ID", "").strip()
    base_url = os.getenv("TEXTBEE_BASE_URL", "https://api.textbee.dev/api/v1").rstrip("/")

    if not api_key:
        print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | Missing TEXTBEE_API_KEY")
        return {"success": False, "error": "SMS provider credentials not configured"}

    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }

    # TextBee requires the device ID in the URL. Auto-detect the first enabled device if not configured.
    if not device_id:
        device_id = _resolve_textbee_device_id(base_url, headers)
    if not device_id:
        print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | No TextBee device available")
        return {"success": False, "error": "No SMS gateway device configured"}

    url = f"{base_url}/gateway/devices/{device_id}/send-sms"
    payload: Dict[str, Any] = {
        "recipients": [normalized],
        "message": message
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code in (200, 201):
            res_data = response.json() if response.content else {}
            provider_id = res_data.get("data", {}).get("messageId") or res_data.get("messageId") or "OK"
            print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | SUCCESS | ProviderId: {provider_id}")
            return {"success": True, "message_id": provider_id}
        else:
            print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | HTTP {response.status_code}")
            return {"success": False, "error": f"Gateway error ({response.status_code})"}
    except requests.Timeout:
        print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | Gateway request timeout")
        return {"success": False, "error": "SMS gateway request timeout"}
    except Exception as exc:
        print(f"[SMS LOG] {now_iso} | {purpose} | {masked} | FAILED | Connection error: {exc.__class__.__name__}")
        return {"success": False, "error": "SMS gateway connection failed"}
