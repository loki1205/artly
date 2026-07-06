"""Qualitative ranking badges.

The app NEVER exposes raw vote counts. From an idea's votes we derive a single
badge. A badge only appears once an idea has at least MIN_VOTES votes; below that
it shows a neutral "New" state.

score = (likes - dislikes) / max(total_votes, 1)   in [-1, 1]
"""
from __future__ import annotations

MIN_VOTES = 3

# key, emoji, label, minimum score (checked high -> low)
_TIERS = [
    ("top_pick", "🔥", "Top Pick", 0.6),
    ("strong", "⭐", "Strong Choice", 0.3),
    ("good", "👍", "Good Choice", 0.1),
    ("mixed", "🤔", "Mixed", -0.1),
    ("low", "👎", "Low Priority", -1.01),
]


def compute_ranking(votes: dict[str, str]) -> dict:
    likes = sum(1 for v in votes.values() if v == "like")
    dislikes = sum(1 for v in votes.values() if v == "dislike")
    total = len(votes)

    if total < MIN_VOTES:
        return {
            "key": "new",
            "emoji": "✨",
            "label": "New",
            "has_badge": False,
            # score kept server-side only for sorting; safe (not a count)
            "score": 0.0,
        }

    score = (likes - dislikes) / max(total, 1)
    for key, emoji, label, threshold in _TIERS:
        if score >= threshold:
            return {
                "key": key,
                "emoji": emoji,
                "label": label,
                "has_badge": True,
                "score": round(score, 4),
            }
    # unreachable, but fail safe
    return {"key": "low", "emoji": "👎", "label": "Low Priority", "has_badge": True, "score": round(score, 4)}
