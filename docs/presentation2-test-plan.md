# Presentation 2 Test Plan

## Goal
Validate the cumulative ClinicalSim AI project before Presentation 2, not only this week's points/retry work. The test plan covers the full current product flow: authentication, case loading, chat, voice, grading, saved attempts, transcript replay, progress tracking, and email delivery.

## Scope
- Authentication and account creation
- Case list loading and case launch
- Chat conversation persistence
- Voice output and voice input
- HPI submission and grading
- Results rendering
- User point calculation and highest-score retention on retries
- Retry flow after graded submission
- Transcript replay for prior submitted attempts
- Email results with transcript inclusion

## Out of Scope
- Production-scale load/performance benchmarking
- Multi-institution deployment concerns
- Full accessibility audit
- Future cases that are not yet implemented in the repository

## Test Strategy

### 1. Automated Checks In Code
The automated portion focuses on backend logic that should be deterministic and repeatable.

#### A. Core Utility, Validation, and Offline Grading Tests
Command:
- `cd backend && npm test`

Files involved:
- `backend/test/caseUtils.test.js`
- `backend/test/llmRubricSchema.test.js`
- `backend/test/gradingFlow.test.js`
- `backend/test/progressSummary.test.js`
- `backend/test/attemptHistory.test.js`
- `backend/test/emailResults.test.js`

What it validates:
- Case and grading JSON files load correctly
- Sensitive hidden case-answer content is removed before patient prompting
- Patient prompt generation includes expected instructions and sanitized data
- Common rubric criteria expand correctly into the case rubric
- LLM rubric outputs are normalized and clamped safely before scoring
- Offline grading still behaves correctly for ideal and weak transcripts
- User-only criteria are not incorrectly satisfied by patient text
- Retry and points logic remains stable
- Previous-attempt summaries for replay remain stable
- Results-email formatting includes transcript content when present

#### B. Rubric / Grading Calibration
Command:
- `cd backend && npm run rubric:calibrate`

Files involved:
- `backend/scripts/calibrateRubric.js`
- `backend/scripts/fixtures/ideal.json`
- `backend/scripts/fixtures/borderline.json`
- `backend/scripts/fixtures/weak.json`

What it validates:
- The grading pipeline still produces expected score ranges for strong, medium, and weak transcripts
- Major grading regressions are caught without depending on manual re-checking
- Section and critical-fail behavior remain consistent enough for demonstration purposes

#### C. Combined Presentation Check
Command:
- `cd backend && npm run test:presentation2`

What it validates:
- The cumulative automated checks for core backend logic and grading calibration both pass before the presentation

### 2. Manual Functional Testing
Manual testing is required because major parts of this project involve UI, audio, external auth, and email delivery that are not fully covered by local automated tests.

#### Authentication
- Sign in with an existing user
- Create a new user account
- Verify the user can reach the cases screen
- Confirm the app recovers correctly after sign-out/sign-in

#### Cases Screen
- Confirm cases load from the backend
- Confirm total points card renders
- Confirm current level updates after completed submissions

#### Chat Flow
- Start a case and confirm a new conversation is created
- Send multiple messages and confirm patient replies are returned
- Leave and resume unfinished chat when applicable

#### Voice Output
- Send a typed message
- Confirm patient TTS plays
- Confirm talking avatar/video plays only while speech is active
- Confirm playback stops cleanly when navigating away

#### Voice Input
- Record audio with the mic button
- Confirm transcription populates the input field
- Confirm repeated record/stop cycles do not crash the recorder state

#### Grading and Results
- Finish interview and enter HPI
- Submit for grading
- Confirm result screen shows score, pass/fail, section scores, and criterion breakdown
- Confirm critical fails and missed red flags render when applicable

#### User Points
- Sign in as a user with no submissions
- Confirm points start at `0` and level `1`
- Submit `uti_level1`
- Confirm cases screen updates with points
- Retry the same case with a lower score
- Confirm total points do not decrease
- Retry the same case with a higher score
- Confirm total points update only to the higher best attempt

#### Retry After Results
- Complete a case and reach the graded results screen
- Tap `Retry Case`
- Confirm a fresh attempt starts with an empty transcript
- Confirm previously submitted result is still preserved in the backend

#### Transcript Replay
- Submit a case
- Open the prior attempt replay/view flow from the Cases screen
- Confirm the attempts list is ordered newest first
- Confirm attempt labels remain consistent after multiple submissions
- Open one saved attempt and confirm the transcript is chronological and associated with the correct submission

#### Email Results
- Submit a case for a user with a valid email
- Confirm the results email is sent
- Confirm transcript content appears in the email
- Confirm score, pass/fail state, section scores, and feedback appear in the email

## Test Data
- Strong rubric fixture transcript
- Borderline rubric fixture transcript
- Weak rubric fixture transcript
- One user account with no prior submissions
- One user account with at least one completed submission
- One completed case attempt with retry behavior exercised

## Pass Criteria
- Automated core utility, validation, and offline grading tests pass
- Automated grading calibration passes expected score ranges
- No blocking failures in auth, chat, grading, or result rendering
- User points stay stable across retries and keep only the highest submitted result per case
- Voice input and voice output both function in the demo build
- Transcript replay and results email are functional in the current merged build
- Transcript replay loads the correct saved submission and transcript
- Results email includes the conversation transcript when email sending is configured

## Current Risks
- Live grading depends on external model latency
- Voice transcription depends on external inference route availability
- Email delivery depends on provider configuration
- Transcript replay and transcript-in-email still depend on end-to-end data integrity between mobile and backend

## Presentation Talking Points
- The test plan is cumulative across the whole current product, not only this week's sprint tasks
- We split testing into automated backend verification and manual end-to-end user testing
- Automated checks currently cover core backend utilities, grading validation, offline grading behavior, grading calibration, progress/retry rules, attempt replay summaries, and transcript email formatting
- Manual checks cover UI, audio, auth, and email flows that require full system interaction
