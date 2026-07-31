"""Password hashing helpers — stdlib only, no plaintext ever stored.

Format stored in Master_User.PasswordHash:
    pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>
"""
import hashlib
import hmac
import os

_ALGO        = "pbkdf2_sha256"
_ITERATIONS  = 200_000
_SALT_BYTES  = 16


def hash_password(plain: str) -> str:
    salt = os.urandom(_SALT_BYTES)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _ITERATIONS)
    return f"{_ALGO}${_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(plain: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != _ALGO:
            return False
        dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"),
                                 bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False
