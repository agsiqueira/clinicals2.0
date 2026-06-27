# Clinicals 2.0 — Agent Instructions

## Project Purpose

Clinicals 2.0 is an AI-powered clinical communication training platform. It helps learners practice patient encounters, receive feedback, unlock roadmap progress, earn badges, and review performance.

The current priority is to preserve the working baseline while improving the platform carefully.

## Repository Structure

- `backend/` — API server, database logic, roadmap/evaluation logic
- `mobile/` — Expo / React Native app
- `docs/` — project documentation and planning notes

## Current Working Principle

Do not propose or implement new features until you understand the existing architecture.

## AI Coach Principle

The AI should guide reflection, not wait for prompts. Dr. Martinez should proactively help the learner understand what happened, what to improve, and what to do next. Detailed evidence should stay tucked away until the learner asks for it.

Before making code changes:

1. Read the relevant files.
2. Explain your understanding.
3. List the files you plan to modify.
4. Explain the risks.
5. Do not claim tests passed unless you actually ran them.

## Core Rules

- Do not break existing study functionality.
- Do not delete existing patient/session data.
- Do not change database schema unless explicitly approved.
- Do not modify authentication unless explicitly asked.
- Do not remove existing mobile/web compatibility.
- Do not rename files or folders casually.
- Prefer small, targeted changes.
- Avoid duplicate logic.
- Reuse existing utilities/components when possible.
- Keep roadmap, badges, scoring, and patient sessions backward compatible.

## Backend Notes

The backend includes:

- API routes
- Prisma database access
- roadmap logic
- session/progress tracking
- conversation/message handling
- evaluation/scoring logic
- voice/TTS/STT-related routes

Before changing backend behavior, inspect:

- routes
- controllers
- utilities
- Prisma schema
- existing migrations
- environment variables

## Mobile Notes

The mobile app includes:

- patient encounter screens
- roadmap/today/portfolio screens
- patient visual assets
- chat interface
- voice/text interaction
- badge/progress UI

Before changing mobile behavior, inspect:

- navigation structure
- screen files
- shared components
- asset mappings
- API configuration
- Expo environment variables

## Known Design Direction

Future improvements may include:

- cartoon-style patient avatars
- real-time lip sync / eye movement
- improved roadmap and badge system
- preceptor feedback
- dashboard/export features
- better session evaluation
- notifications and encouragement
- AI checks for attire/voice tone

These are not approved for coding yet. First document and understand the existing project.

## Required Behavior for Codex

When asked to inspect the project, produce documentation before code.

When asked to code, first respond with:

- understanding of the request
- impacted areas
- files likely to change
- risks
- proposed implementation plan

Only then make changes when approved.

## Testing Rule

Never say tests pass unless you actually ran them.

Use exact language:

- “I ran X and it passed.”
- “I did not run tests.”
- “I could not run tests because…”

## Git Rule

Before major changes, confirm the working tree status.

Prefer commits/tags after stable milestones.

## Safety Rule

This project is being prepared for real study use. Stability matters more than speed.
