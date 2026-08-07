from __future__ import annotations

import logging
import math
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [cv] %(levelname)s %(message)s",
)
log = logging.getLogger("nzsl.cv")

app = FastAPI(title="Practice CV", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoreRequest(BaseModel):
    landmarks: list[float] = Field(default_factory=list)
    lessonName: str = ""


class ScoreResponse(BaseModel):
    score: float
    signalCodes: list[str]
    basis: dict[str, Any]


# Two-hand letter templates: [baseHand x5, activeHand x5], order-invariant matching.
LETTER_TEMPLATES: dict[str, dict[str, Any]] = {
    # A: open flat hand + index pointing to thumb tip
    "A": {
        "curls": [0.25, 0.12, 0.12, 0.12, 0.12, 0.7, 0.12, 0.85, 0.85, 0.85],
        "dist": 0.16,
        "requireTwo": True,
        "contact": {"baseTip": 4, "activeTip": 8, "maxDist": 0.12},
    },
    "B": {"curls": [0.7, 0.12, 0.12, 0.12, 0.12, 0.7, 0.2, 0.85, 0.85, 0.85], "dist": 0.18, "requireTwo": True},
    "C": {"curls": [0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35], "dist": 0.14, "requireTwo": True},
    "D": {"curls": [0.25, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "E": {"curls": [0.75, 0.75, 0.75, 0.75, 0.75, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "F": {"curls": [0.2, 0.15, 0.75, 0.75, 0.75, 0.2, 0.15, 0.8, 0.8, 0.8], "dist": 0.16, "requireTwo": True},
    "G": {"curls": [0.7, 0.75, 0.75, 0.75, 0.75, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.12, "requireTwo": True},
    "H": {"curls": [0.25, 0.15, 0.15, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "I": {"curls": [0.7, 0.8, 0.8, 0.8, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "J": {"curls": [0.7, 0.8, 0.8, 0.8, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.18, "requireTwo": True},
    "K": {"curls": [0.2, 0.15, 0.15, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "L": {"curls": [0.15, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "M": {"curls": [0.7, 0.2, 0.2, 0.2, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "N": {"curls": [0.7, 0.2, 0.2, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "O": {"curls": [0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4], "dist": 0.12, "requireTwo": True},
    "P": {"curls": [0.2, 0.15, 0.15, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "Q": {"curls": [0.2, 0.15, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "R": {"curls": [0.25, 0.2, 0.2, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "S": {"curls": [0.8, 0.8, 0.8, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "T": {"curls": [0.25, 0.8, 0.8, 0.8, 0.8, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "U": {"curls": [0.7, 0.12, 0.12, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "V": {"curls": [0.7, 0.12, 0.12, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.15, "requireTwo": True},
    "W": {"curls": [0.7, 0.12, 0.12, 0.12, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.15, "requireTwo": True},
    "X": {"curls": [0.25, 0.4, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.14, "requireTwo": True},
    "Y": {"curls": [0.15, 0.85, 0.85, 0.85, 0.15, 0.7, 0.75, 0.75, 0.75, 0.75], "dist": 0.16, "requireTwo": True},
    "Z": {
        "curls": [0.25, 0.12, 0.85, 0.85, 0.85, 0.7, 0.75, 0.75, 0.75, 0.75],
        "dist": 0.15,
        "requireTwo": True,
        "contact": {"baseTip": 4, "activeTip": 8, "maxDist": 0.14},
    },
}


def _dist(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _finger_curl(
    hand: list[tuple[float, float, float]], tip: int, pip: int, mcp: int
) -> float:
    tip_to_mcp = _dist(hand[tip], hand[mcp])
    pip_to_mcp = max(_dist(hand[pip], hand[mcp]), 1e-6)
    extension = tip_to_mcp / (pip_to_mcp * 2.2)
    curl = 1 - min(1.0, max(0.0, extension))
    return round(curl, 3)


def _hand_curls(hand: list[tuple[float, float, float]]) -> list[float]:
    return [
        _finger_curl(hand, 4, 3, 2),
        _finger_curl(hand, 8, 6, 5),
        _finger_curl(hand, 12, 10, 9),
        _finger_curl(hand, 16, 14, 13),
        _finger_curl(hand, 20, 18, 17),
    ]


def _parse_hands(landmarks: list[float]) -> list[list[tuple[float, float, float]]]:
    point_count = len(landmarks) // 3
    hand_count = point_count // 21
    hands: list[list[tuple[float, float, float]]] = []
    for h in range(hand_count):
        hand: list[tuple[float, float, float]] = []
        for i in range(21):
            base = (h * 21 + i) * 3
            hand.append(
                (
                    landmarks[base],
                    landmarks[base + 1],
                    landmarks[base + 2] if base + 2 < len(landmarks) else 0.0,
                )
            )
        hands.append(hand)
    return hands


def _mean_abs_error(a: list[float], b: list[float]) -> float:
    n = min(len(a), len(b))
    if n == 0:
        return 1.0
    return sum(abs(a[i] - b[i]) for i in range(n)) / n


def _signals_for_score(score: float) -> list[str]:
    if score >= 70:
        return ["stable_hand", "shape_close"]
    if score >= 45:
        return ["shape_close", "low_confidence"]
    return ["shape_mismatch", "low_confidence"]


def _score_against_template(
    hands: list[list[tuple[float, float, float]]], template: dict[str, Any]
) -> dict[str, Any]:
    curls_a = _hand_curls(hands[0])
    curls_b = _hand_curls(hands[1])
    inter_dist = _dist(hands[0][0], hands[1][0])

    candidates = [
        {"curls": curls_a + curls_b, "base": hands[0], "active": hands[1], "order": "0=base,1=active"},
        {"curls": curls_b + curls_a, "base": hands[1], "active": hands[0], "order": "1=base,0=active"},
    ]

    best = {"score": 0.0, "curls": candidates[0]["curls"], "contactScore": None, "order": candidates[0]["order"]}

    for candidate in candidates:
        curl_err = _mean_abs_error(candidate["curls"], template["curls"])
        dist_err = min(1.0, abs(inter_dist - template["dist"]) / 0.4)
        similarity = math.exp(-1.5 * curl_err) * math.exp(-0.6 * dist_err)

        contact_score = None
        contact = template.get("contact")
        if contact:
            base_tip = candidate["base"][contact["baseTip"]]
            active_tip = candidate["active"][contact["activeTip"]]
            d = _dist(base_tip, active_tip)
            contact_score = max(0.0, 1.0 - d / contact["maxDist"])
            similarity = similarity * 0.55 + contact_score * 0.45

        template_base_open = 1 - sum(template["curls"][:5]) / 5
        if template_base_open > 0.55:
            base_open = 1 - sum(candidate["curls"][:5]) / 5
            similarity = similarity * 0.8 + max(0.0, base_open) * 0.2

        template_active_index = template["curls"][6]
        if template_active_index < 0.35:
            index_ext = 1 - candidate["curls"][6]
            other_curl = (candidate["curls"][7] + candidate["curls"][8] + candidate["curls"][9]) / 3
            point_quality = index_ext * 0.6 + other_curl * 0.4
            similarity = similarity * 0.85 + point_quality * 0.15

        score = round(max(0.0, min(100.0, similarity * 100)), 1)
        if score >= best["score"]:
            best = {
                "score": score,
                "curls": candidate["curls"],
                "contactScore": contact_score,
                "order": candidate["order"],
            }

    best["interDist"] = inter_dist
    return best


def score_landmarks(landmarks: list[float], lesson_name: str = "") -> ScoreResponse:
    hands = _parse_hands(landmarks)
    if not hands:
        basis = {
            "method": "mediapipe_handshape_score",
            "rule": "no_hand_detected",
            "reason": "No hand landmarks received",
        }
        log.info("score lesson=%s score=0 signals=%s", lesson_name, ["hand_not_in_frame"])
        return ScoreResponse(score=0, signalCodes=["hand_not_in_frame"], basis=basis)

    letter = lesson_name.strip().upper()
    template = LETTER_TEMPLATES.get(letter)

    if template and template["requireTwo"] and len(hands) < 2:
        presence = min(40, 20 + len(hands) * 15)
        basis = {
            "method": "mediapipe_handshape_score",
            "rule": "alphabet_requires_two_hands",
            "handCount": len(hands),
            "lesson": letter,
            "reason": "This letter uses two hands. Keep both hands in frame.",
        }
        log.info("score lesson=%s score=%s signals=%s", letter, presence, ["need_both_hands"])
        return ScoreResponse(score=presence, signalCodes=["need_both_hands"], basis=basis)

    if template and len(hands) >= 2:
        matched = _score_against_template(hands, template)
        score = matched["score"]
        signals = _signals_for_score(score)
        basis = {
            "method": "mediapipe_handshape_score",
            "rule": "letter_template_similarity_order_invariant",
            "lesson": letter,
            "handCount": len(hands),
            "curls": matched["curls"],
            "interHandDistance": round(matched["interDist"], 4),
            "contactScore": matched["contactScore"],
            "handRoleOrder": matched["order"],
            "template": template,
            "reason": (
                "Score compares finger curls (both hand role assignments) and tip contact "
                "to the letter template."
            ),
        }
        log.info(
            "score lesson=%s score=%s signals=%s contact=%s order=%s",
            letter,
            score,
            signals,
            matched["contactScore"],
            matched["order"],
        )
        return ScoreResponse(score=score, signalCodes=signals, basis=basis)

    curls = _hand_curls(hands[0]) + (_hand_curls(hands[1]) if len(hands) > 1 else [0.5, 0.5, 0.5, 0.5, 0.5])
    openness_vals = []
    for hand in hands:
        xs = [p[0] for p in hand]
        ys = [p[1] for p in hand]
        openness_vals.append(max(max(xs) - min(xs), max(ys) - min(ys)))
    openness = max(openness_vals)
    curl_variance = sum(abs(c - 0.5) for c in curls) / len(curls)
    score = round(max(25.0, min(92.0, openness * 140 + curl_variance * 40)), 1)
    signals = ["stable_hand"] if score >= 60 else ["low_confidence", "shape_mismatch"]
    basis = {
        "method": "mediapipe_handshape_score",
        "rule": "generic_hand_pose_stability",
        "lesson": letter or None,
        "handCount": len(hands),
        "curls": curls,
        "reason": "Score uses hand visibility and finger articulation stability (not full letter ID).",
    }
    log.info("score lesson=%s score=%s signals=%s", letter or lesson_name, score, signals)
    return ScoreResponse(score=score, signalCodes=signals, basis=basis)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    return score_landmarks(body.landmarks, body.lessonName)
