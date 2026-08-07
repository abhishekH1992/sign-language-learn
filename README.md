# NZSL Learn

Accessible NZSL learning app: Payload CMS admin, Next.js learner UI, Postgres, OpenAI constructive feedback, and a Python MediaPipe-friendly practice scoring service.

## Stack

- Next.js + Payload CMS 3 (admin + API)
- Postgres
- OpenAI (`OPENAI_API_KEY`) for quiz/practice feedback text
- Python FastAPI CV service (`services/cv`) for hand-landmark scoring
- Browser MediaPipe Hands for camera landmarks

## Setup / run commands

From the project root (`nzsl/`):

```bash
# 1) Env + deps (first time)
cp .env.example .env
# edit .env — set OPENAI_API_KEY if you want AI tips
npm install

# 2) Postgres must be running with DB `nzsl`
# Homebrew example:
#   createdb -h 127.0.0.1 nzsl
# Or Docker:
#   npm run db:up

# 3) Parse NZSL HTML dump → seed JSON (first time / when dumps change)
npm run parse:nzsl

# 4) Terminal A — Next.js + Payload
npm run dev
# Optional: seed sample content
# npm run seed

# 5) Terminal B — CV scoring API (practice camera)
python3 -m venv services/cv/.venv
source services/cv/.venv/bin/activate
pip install -r services/cv/requirements.txt
uvicorn main:app --reload --port 8000
# (run from services/cv/)
# or: npm run cv:dev
```

Open:
- Learner UI: http://localhost:3000
- Admin: http://localhost:3000/admin

Demo logins: `learner@example.com` / `password123`, `admin@example.com` / `password123`

Sample content is not seeded on boot. Run `npm run seed` for Basics → Alphabets (A–Z lessons + media crops). Media-only: `npm run seed:alphabet`.

### Practice logs

On the practice page, open DevTools → Console for `[NZSL practice]` logs (camera open, live score, feedback basis).  
CV service logs appear in the Terminal B uvicorn output.  
Server feedback logs appear in the Terminal A Next.js output.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run parse:nzsl` | HTML dump → `src/seed/data/number-chapter.json` |
| `npm run seed` | Upsert chapters/lessons/quizzes |
| `npm run dev` | Next + Payload |
| `npm run cv:dev` | Python scoring API on :8000 |

## Accessibility

Learner UI targets WCAG 2.2 AA patterns: keyboard focus, labelled forms, visual+text feedback (never sound-only), progress as bar + text, large video stage, `prefers-reduced-motion` respected.
