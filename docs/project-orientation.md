# Project Orientation

## 1. Project Purpose

Clinicals 2.0 is an AI-powered clinical communication training platform. It helps learners practice patient encounters, receive feedback, track roadmap progress, earn badges, and review performance over time.

The current priority is to preserve the working baseline while improving the platform carefully. Stability matters because the project is being prepared for real study use.

## 2. Top-Level Structure

- `backend/` - Express API server, Prisma database access, roadmap/progress logic, conversation handling, grading, and voice-related routes.
- `mobile/` - Expo / React Native app with Expo Router, Clerk authentication, patient encounters, roadmap, portfolio, and voice interactions.
- `docs/` - Project documentation, competency framework notes, session authoring notes, and test planning.
- `cases/` - Clinical case source content used by the backend case loading/sync flow.
- `AGENTS.md` - Repository rules for Codex and future development work.
- `README.md` - Root project readme.

## 3. Backend Overview

The backend is a Node.js application using Express, Prisma, and PostgreSQL.

Primary entry point:

- `backend/src/index.js`

Key backend areas:

- `backend/src/routes/` - API route modules.
- `backend/src/services/` - Higher-level application services for progress, session attempts, portfolio, today view, faculty dashboard, competency logic, and motivational achievements.
- `backend/src/utils/` - Case loading/sync, roadmap building, grading, progress summaries, patient prompts, user resolution, achievement scoring, and related helpers.
- `backend/src/db/prisma.js` - Prisma client setup.
- `backend/src/llm/navigatorClient.js` - Navigator LLM, grading, TTS, and transcription client logic.
- `backend/prisma/schema.prisma` - Database schema.
- `backend/scripts/seedClinicals2.js` - Seed script for Clinicals 2.0 content.

Routes mounted by `backend/src/index.js` include:

- `/api/cases`
- `/api/chat`
- `/api/grade`
- `/api/conversations`
- `/api/voice`
- `/api/progress`
- `/api/learning-paths`
- `/api/clinical-portfolio`
- `/api/today`
- `/api/faculty`
- `/api/profile`
- `/api/health`

## 4. Mobile Overview

The mobile app is built with Expo SDK 54, React Native, Expo Router, and Clerk authentication.

Primary entry points:

- `mobile/app/_layout.tsx` - Root layout, Clerk provider, signed-in/signed-out routing, and app shell.
- `mobile/app/(tabs)/_layout.tsx` - Main tab navigation.
- `mobile/app/(tabs)/index.tsx` - Today screen.
- `mobile/app/(tabs)/cases.tsx` - Roadmap/cases screen.
- `mobile/app/(tabs)/portfolio.tsx` - Portfolio screen.
- `mobile/app/(tabs)/level1.tsx` - Main clinical encounter screen.
- `mobile/src/api/client.js` - Shared mobile API client.

Important mobile directories:

- `mobile/app/` - Expo Router screens and layouts.
- `mobile/src/components/` - Clinical UI components such as avatars, cards, chat composer, timeline, and progress visuals.
- `mobile/src/hooks/` - Speech transcription, speech playback, and voice preference hooks.
- `mobile/src/utils/` - Asset mappings, clinical display helpers, and storage helpers.
- `mobile/assets/` - Styles, images, patient assets, and related media.

## 5. Main Clinical Encounter Flow

The main learner encounter flow appears to connect these areas:

- `mobile/app/(tabs)/cases.tsx` displays roadmap/session information and launches encounters.
- `mobile/app/(tabs)/level1.tsx` runs the encounter experience, including patient display, chat, voice options, grading/result handling, and debrief interactions.
- `mobile/src/components/ClinicalsChatComposer.tsx` supports text/voice input composition.
- `mobile/src/components/AnimatedPatientAvatar.tsx` and `mobile/src/components/PatientAvatar.tsx` handle patient visuals.
- `mobile/src/utils/patientAssets.ts` maps patient/session assets.
- `backend/src/routes/conversations.js` manages persisted conversations, messages, submission, grading, and progress sync.
- `backend/src/routes/chat.js` provides a simpler chat route.
- `backend/src/routes/grade.js` provides a grading route.
- `backend/src/utils/patientPrompt.js` builds patient prompts.
- `backend/src/utils/grading.js` handles grading logic.
- `backend/src/services/sessionAttempts.js` connects conversations/submissions to session attempts, badges, debriefs, and competency evidence.

## 6. Roadmap / Progress / Badge System

The roadmap and progress system is built around learning paths, units, patient sessions, attempts, scores, badge tiers, achievements, XP, streaks, and portfolio summaries.

Important backend files:

- `backend/src/routes/learningPaths.js` - Roadmap and patient session overview endpoints.
- `backend/src/utils/roadmap.js` - Roadmap/session summary builders.
- `backend/src/routes/progress.js` - User progress endpoint.
- `backend/src/services/userProgress.js` - Progress summary sync.
- `backend/src/utils/progressSummary.js` - Progress summary calculation.
- `backend/src/utils/achievementScoring.js` - Achievement scoring and badge tier calculation.
- `backend/src/services/sessionAttempts.js` - Session attempt creation/finalization and debrief payloads.
- `backend/src/services/motivationalAchievements.js` - Motivational achievement definitions and evaluation.
- `backend/src/services/clinicalPortfolio.js` - Portfolio summary generation.
- `backend/src/routes/clinicalPortfolio.js` - Portfolio API route.
- `backend/src/routes/today.js` and `backend/src/services/today.js` - Today view and recommended encounter logic.

Important mobile files:

- `mobile/app/(tabs)/index.tsx` - Today screen.
- `mobile/app/(tabs)/cases.tsx` - Roadmap screen.
- `mobile/app/(tabs)/portfolio.tsx` - Portfolio/progress screen.
- `mobile/app/attempts.tsx` - Attempt history.
- `mobile/app/attempt-result.tsx` - Attempt result display.
- `mobile/src/components/EncounterNodeCard.tsx`
- `mobile/src/components/CompactJourneyCard.tsx`
- `mobile/src/components/SessionCard.tsx`
- `mobile/src/components/CompetencyProfileTab.tsx`
- `mobile/src/components/Sparkline.tsx`
- `mobile/src/components/TimelineEvent.tsx`

## 7. Voice / Audio System

Voice and audio support spans backend Navigator routes and mobile recording/playback hooks.

Important backend files:

- `backend/src/routes/voice.js` - `/api/voice/speak` and `/api/voice/transcribe`.
- `backend/src/llm/navigatorClient.js` - TTS and transcription requests, Navigator model configuration, and error handling.

Important mobile files:

- `mobile/src/hooks/useEnglishSpeechTranscription.ts` - Recording/transcription workflow.
- `mobile/src/hooks/useSpeechPlayback.ts` - Speech playback workflow.
- `mobile/src/hooks/useVoicePreference.ts` - Persistent voice preference.
- `mobile/app/(tabs)/level1.tsx` - Encounter-level integration for voice/audio.
- `mobile/app/(tabs)/cases.tsx` - Roadmap/preceptor interaction voice hooks.
- `mobile/src/components/ClinicalsChatComposer.tsx` - Composer UI for chat and voice input.

Related assets:

- `mobile/assets/patients/` includes patient images and speaking-loop media for current patient sessions.

## 8. Configuration / Environment Files

Backend configuration:

- `backend/package.json` - Backend scripts and dependencies.
- `backend/.env.example` - Required backend environment variables.
- `backend/app.json` - Backend app metadata/config.
- `backend/prisma/schema.prisma` - Prisma schema.
- `backend/prisma/migrations/` - Existing database migrations.

Important backend environment variables include:

- `DATABASE_URL`
- `PORT`
- `NAVIGATOR_API_KEY`
- `NAVIGATOR_BASE`
- `NAVIGATOR_MODEL`
- `NAVIGATOR_GRADING_MODEL`
- `NAVIGATOR_TTS_MODEL`
- `NAVIGATOR_TTS_VOICE`
- `NAVIGATOR_TTS_SPEED`
- `NAVIGATOR_TTS_TIMEOUT_MS`
- `NAVIGATOR_IMAGE_MODEL`

Mobile configuration:

- `mobile/package.json` - Mobile scripts and dependencies.
- `mobile/.env.example` - Public mobile environment variables.
- `mobile/app.config.js` - Expo app config.
- `mobile/app.json` - Expo app metadata.
- `mobile/eas.json` - EAS build config.
- `mobile/tsconfig.json` - TypeScript config.
- `mobile/eslint.config.js` - Lint config.

Important mobile environment variables include:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

## 9. Current Risks And Confusing Areas

- `mobile/app/(tabs)/level1.tsx` is very large and appears to combine encounter UI, API calls, audio handling, result normalization, debrief logic, and badge display. Changes there may have a wide blast radius.
- Request logic appears duplicated in places. The mobile app has `mobile/src/api/client.js`, but some screens also define local request helpers.
- Backend has both simple/older routes (`chat`, `grade`) and richer persisted routes (`conversations`, `sessionAttempts`). Future changes need to confirm which path the mobile app actually uses for each workflow.
- Mobile code mixes JavaScript and TypeScript/TSX. For example, the shared API client is `client.js`, while most screens are TSX.
- Auth and user resolution rely on Clerk identity data passed from mobile to backend. Several routes implement similar `getClerkUserId` and `resolveUser` patterns.
- Roadmap, progress, badges, achievements, session attempts, and portfolio are tightly connected. Small changes in scoring or attempt finalization could affect multiple user-facing screens.
- Voice/audio behavior depends on Navigator API configuration, Expo AV behavior, file-system behavior, and platform differences between native and web.
- Existing patient/session data and Prisma schema must be treated carefully because backward compatibility is a project rule.

## 10. Rules For Future Development

- Preserve existing study functionality.
- Do not delete existing patient/session data.
- Do not change the database schema unless explicitly approved.
- Do not modify authentication unless explicitly asked.
- Do not remove existing mobile/web compatibility.
- Do not rename files or folders casually.
- Prefer small, targeted changes.
- Avoid duplicate logic.
- Reuse existing utilities and components when possible.
- Keep roadmap, badges, scoring, and patient sessions backward compatible.
- Before changing backend behavior, inspect routes, services, utilities, Prisma schema, migrations, and environment variables.
- Before changing mobile behavior, inspect navigation, screens, shared components, asset mappings, API configuration, and Expo environment variables.
- Before major changes, confirm working tree status.
- Do not claim tests passed unless they were actually run.
- When asked to code, first document understanding, impacted areas, likely files, risks, and an implementation plan, then wait for approval.
