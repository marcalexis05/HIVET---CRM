import os

def contains_profanity(text: str) -> bool:
    """Replicated logic from main.py for verification."""
    if not text:
        return False
    
    profane_words = {
        "fuck", "shit", "asshole", "bitch", "bastard", "cunt", "dick", "pussy", 
        "faggot", "nigger", "whore", "slut", "damn", "hell", "retard",
        "puta", "pukina", "tarantado", "gago", "tangina", "kupal", "puchu", 
        "bobo", "ulol", "lintik", "hayup", "tanga", "pesti", "leche", "pokpok",
        "kantot", "iyot", "jakol", "buru", "bayag", "burat", "tilapia", "tinggil"
    }
    
    cleaned_lower = text.lower().replace(" ", "").replace("_", "").replace("-", "").replace(".", "")
    
    for word in profane_words:
        if word in cleaned_lower:
            return True
    return False

test_cases = [
    ("Buddy", False),
    ("Luna", False),
    ("Fuck", True),
    ("Putang Ina", True),
    ("Tarantado123", True),
    ("B.O.B.O", True),
    ("Maximus", False),
    ("Gago_Pet", True)
]

print("Starting Profanity Filter Verification...")
passed = 0
for text, expected in test_cases:
    result = contains_profanity(text)
    status = "PASS" if result == expected else "FAIL"
    print(f"[{status}] Input: '{text}' | Expected: {expected} | Got: {result}")
    if result == expected:
        passed += 1

print(f"\nVerification Complete: {passed}/{len(test_cases)} tests passed.")
