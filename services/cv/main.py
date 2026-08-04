from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [cv] %(levelname)s %(message)s",
)
log = logging.getLogger("nzsl.cv")

app = FastAPI(title="NZSL Practice CV", version="1.0.0")

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


def score_landmarks(landmarks: list[float], lesson_name: str = "") -> ScoreResponse:
    if len(landmarks) < 63:
        basis = {
            "method": "mediapipe_hand_landmarks",
            "rule": "need_21_points",
            "landmarkCount": len(landmarks) // 3,
            "reason": "Fewer than 21 hand landmarks received",
        }
        log.info("score lesson=%s score=0 signals=%s basis=%s", lesson_name, ["hand_not_in_frame"], basis)
        return ScoreResponse(score=0, signalCodes=["hand_not_in_frame"], basis=basis)

    xs = landmarks[0::3]
    ys = landmarks[1::3]

    if not xs or not ys:
        basis = {
            "method": "mediapipe_hand_landmarks",
            "rule": "empty_xy",
            "reason": "Could not read x/y landmark arrays",
        }
        log.info("score lesson=%s score=0 signals=%s basis=%s", lesson_name, ["hand_not_in_frame"], basis)
        return ScoreResponse(score=0, signalCodes=["hand_not_in_frame"], basis=basis)

    in_frame = all(0.05 < x < 0.95 for x in xs) and all(0.05 < y < 0.95 for y in ys)
    if not in_frame:
        basis = {
            "method": "mediapipe_hand_landmarks",
            "rule": "in_frame_margin_5pct",
            "xRange": [round(min(xs), 3), round(max(xs), 3)],
            "yRange": [round(min(ys), 3), round(max(ys), 3)],
            "reason": "Hand landmarks outside the 5%–95% frame margin",
        }
        log.info("score lesson=%s score=25 signals=%s basis=%s", lesson_name, ["hand_not_in_frame"], basis)
        return ScoreResponse(score=25, signalCodes=["hand_not_in_frame"], basis=basis)

    spread = max(xs) - min(xs)
    height = max(ys) - min(ys)
    openness = max(spread, height)

    # Heuristic: larger visible hand span → higher confidence score (not full NZSL sign ID).
    score = max(40.0, min(96.0, openness * 170))
    signals: list[str] = []
    if score < 60:
        signals.extend(["low_confidence", "shape_mismatch"])
    else:
        signals.append("stable_hand")

    if height < 0.12:
        signals.append("raise_hand")

    basis = {
        "method": "mediapipe_hand_landmarks",
        "rule": "hand_span_openness_heuristic",
        "formula": "score = clamp(max(spread, height) * 170, 40, 96)",
        "spread": round(spread, 4),
        "height": round(height, 4),
        "openness": round(openness, 4),
        "thresholds": {
            "stableHandMinScore": 60,
            "raiseHandMaxHeight": 0.12,
        },
        "reason": (
            "Feedback is based on MediaPipe 21-point hand landmarks: whether the hand is in frame, "
            "how large/open the hand appears, and simple score thresholds — not full NZSL sign recognition."
        ),
    }
    log.info(
        "score lesson=%s score=%s signals=%s spread=%.4f height=%.4f",
        lesson_name,
        round(score, 1),
        signals,
        spread,
        height,
    )
    return ScoreResponse(score=round(score, 1), signalCodes=signals, basis=basis)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(body: ScoreRequest) -> ScoreResponse:
    return score_landmarks(body.landmarks, body.lessonName)
