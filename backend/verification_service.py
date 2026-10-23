import secrets
import hashlib
import datetime
from typing import Optional, Tuple, Dict, Any, List

class VerificationCodeStore:
    def __init__(self):
        # Current active code records: key -> dict
        # Key format: f"{purpose}:{identifier.lower()}"
        self._records: Dict[str, Dict[str, Any]] = {}
        
        # History of generated codes for rate limiting:
        # identifier -> list of datetime timestamps
        self._history_by_identifier: Dict[str, List[datetime.datetime]] = {}
        
        # IP history for rate limiting:
        # ip -> list of datetime timestamps
        self._history_by_ip: Dict[str, List[datetime.datetime]] = {}

    def _hash_code(self, code: str, salt: str) -> str:
        return hashlib.sha256(f"{salt}:{code}".encode("utf-8")).hexdigest()

    def check_rate_limits(self, identifier: str, ip_address: Optional[str] = None) -> Tuple[bool, str]:
        """
        Enforces:
        - 60 seconds cooldown between code requests
        - Max 5 codes per identifier per hour
        - Max 20 codes per identifier per day
        - Max 10 requests per IP per hour
        """
        now = datetime.datetime.utcnow()
        clean_id = identifier.strip().lower()

        # Check IP limit
        if ip_address:
            ip_history = self._history_by_ip.get(ip_address, [])
            one_hour_ago = now - datetime.timedelta(hours=1)
            recent_ip = [t for t in ip_history if t > one_hour_ago]
            self._history_by_ip[ip_address] = recent_ip
            if len(recent_ip) >= 10:
                return False, "Too many requests from this network. Please wait before trying again."

        # Check identifier history
        id_history = self._history_by_identifier.get(clean_id, [])
        one_min_ago = now - datetime.timedelta(seconds=60)
        one_hour_ago = now - datetime.timedelta(hours=1)
        one_day_ago = now - datetime.timedelta(days=1)

        # 60s cooldown
        recent_60s = [t for t in id_history if t > one_min_ago]
        if recent_60s:
            return False, "Please wait 60 seconds before requesting a new code"

        # Hourly limit
        recent_hour = [t for t in id_history if t > one_hour_ago]
        if len(recent_hour) >= 5:
            return False, "Maximum hourly code limit reached. Please try again later."

        # Daily limit
        recent_day = [t for t in id_history if t > one_day_ago]
        if len(recent_day) >= 20:
            return False, "Maximum daily code limit reached. Please try again tomorrow."

        return True, ""

    def create_code(
        self,
        purpose: str,
        identifier: str,
        phone: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Generates a secure 6-digit code with leading zeroes.
        Stores only the salted hash and metadata.
        Returns: (plain_code, error_message).
        """
        allowed, err = self.check_rate_limits(identifier, ip_address)
        if not allowed:
            return None, err

        # Generate cryptographically secure 6-digit code
        plain_code = f"{secrets.randbelow(1000000):06d}"
        salt = secrets.token_hex(16)
        code_hash = self._hash_code(plain_code, salt)

        now = datetime.datetime.utcnow()
        expires_at = now + datetime.timedelta(minutes=10)
        clean_id = identifier.strip().lower()
        key = f"{purpose}:{clean_id}"

        # Record details
        self._records[key] = {
            "purpose": purpose,
            "identifier": clean_id,
            "phone": phone,
            "salt": salt,
            "code_hash": code_hash,
            "created_at": now,
            "expires_at": expires_at,
            "wrong_tries": 0,
            "used": False
        }

        # Update rate-limiting history
        id_history = self._history_by_identifier.setdefault(clean_id, [])
        id_history.append(now)
        if ip_address:
            ip_hist = self._history_by_ip.setdefault(ip_address, [])
            ip_hist.append(now)

        return plain_code, None

    def verify_code(self, purpose: str, identifier: str, candidate_code: str) -> Tuple[bool, str]:
        """
        Verifies a candidate code against the hashed record.
        Enforces single-use, 10 min expiration, and max 5 attempts.
        Returns (is_valid, error_detail).
        """
        clean_id = identifier.strip().lower()
        key = f"{purpose}:{clean_id}"
        record = self._records.get(key)

        if not record or record.get("used"):
            return False, "No verification code requested for this account"

        now = datetime.datetime.utcnow()
        if now > record["expires_at"]:
            del self._records[key]
            return False, "Verification code has expired"

        # Check maximum wrong tries (max 5)
        if record["wrong_tries"] >= 5:
            del self._records[key]
            return False, "Too many incorrect attempts. Please request a new code."

        candidate_clean = candidate_code.strip()
        candidate_hash = self._hash_code(candidate_clean, record["salt"])

        if candidate_hash != record["code_hash"]:
            record["wrong_tries"] += 1
            if record["wrong_tries"] >= 5:
                del self._records[key]
                return False, "Too many incorrect attempts. Please request a new code."
            return False, "Invalid verification code"

        # Mark code as used immediately so it cannot be reused
        record["used"] = True
        del self._records[key]
        return True, ""

# Global singleton instance for verification codes
verification_store = VerificationCodeStore()
