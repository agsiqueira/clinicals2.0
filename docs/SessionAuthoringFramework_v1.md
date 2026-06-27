# Clinicals 2.0 Session Authoring Framework v1

Status: Design draft for faculty review  
Scope: Educational authoring methodology only  
Companion document: `docs/CompetencyFramework_v1.md`  
Last updated: June 26, 2026

## Purpose

This document defines how Clinicals 2.0 learning experiences should be authored so that each patient session generates meaningful evidence for competency growth.

It is intended for:

- Nursing faculty.
- Instructional designers.
- Simulation specialists.
- Future AI authoring tools.
- Developers implementing future authoring workflows.

This is not an implementation specification. It does not modify code, APIs, scoring, frontend behavior, database schema, authentication, or roadmap progression.

## Assumptions

- A Clinicals session is an instructional activity, not merely a patient conversation.
- Every session should have an explicit educational purpose.
- Every objective should map to one or more competencies.
- Competency evidence should be observable, explainable, and reviewable.
- Session scores remain useful, but they are only one part of the learning record.
- Faculty should validate clinical accuracy, difficulty, objective quality, and competency mapping before a session is published.

## Items Requiring Nursing Faculty Validation

- Clinical accuracy of each case.
- Appropriateness of difficulty and learning level.
- Completeness and priority of objectives.
- Competency mapping and objective weights.
- Safety-critical behaviors.
- Rubric criteria and scoring emphasis.
- Debrief content and remediation recommendations.
- Student-facing language.

## Part 1: Educational Philosophy

A Clinicals session should be designed backward from the competencies it is intended to develop. The patient conversation is the visible experience, but the educational design underneath should define what the learner is expected to demonstrate and what evidence the system should collect.

```text
Student
  |
  v
Conversation
  |
  v
Objectives
  |
  v
Evidence
  |
  v
Competencies
  |
  v
Growth
```

In this model, the session is a structured learning activity. The patient scenario creates a realistic context. The conversation gives the learner space to act. Objectives identify the expected behaviors. Evidence captures what the learner demonstrated. Competency mapping connects those behaviors to durable educational outcomes. Over time, repeated evidence supports growth and eventual mastery.

This approach helps Clinicals 2.0 answer better questions:

- What is this session designed to teach?
- What competency evidence will it generate?
- How will faculty know whether the learner demonstrated the expected behaviors?
- How will this session contribute to longitudinal growth?
- What should the learner practice next?

## Part 2: Session Anatomy

Every Clinicals session should be authored with a consistent educational structure.

### 1. Session Metadata

High-level identifying and instructional information, such as title, unit, difficulty, duration, clinical setting, learning level, and prerequisites.

### 2. Patient

The simulated patient profile, including demographics, personality, communication style, relevant background, and clinical context.

### 3. Scenario

The presenting situation, chief concern, clinical setup, and what the learner is expected to accomplish.

### 4. Difficulty

The intended level of complexity, including clinical complexity, communication complexity, reasoning demand, and safety risk.

### 5. Estimated Time

The expected duration for the encounter, debrief, and reflection.

### 6. Primary Competencies

The main competency domains this session is designed to develop and assess.

### 7. Secondary Competencies

Additional competencies that may receive evidence but are not the main instructional focus.

### 8. Learning Objectives

Specific observable behaviors the learner should demonstrate during the session.

### 9. Conversation Flow

The expected phases of the patient interaction, including greeting, rapport, history, clarification, education, closing, and debrief.

### 10. Expected Behaviors

Observable actions that indicate quality performance, including communication style, empathy, safety, clinical reasoning, and patient education behaviors.

### 11. Assessment Rubric

The criteria used to evaluate performance. The rubric should distinguish objective completion, quality of interaction, safety, reasoning, and competency evidence.

### 12. Debrief

Structured feedback that explains strengths, growth areas, competencies demonstrated, and recommended next steps.

### 13. Reflection

Prompts that help students interpret their performance and plan improvement.

### 14. Faculty Notes

Instructor-facing guidance about common learner mistakes, teaching points, clinical nuance, and validation concerns.

## Part 3: Session Metadata

Session metadata should make the educational intent and clinical context clear before anyone reviews the patient content.

Recommended fields:

| Field | Description |
| --- | --- |
| Session ID | Stable internal identifier for the session. |
| Title | Human-readable case title. |
| Unit | Curriculum unit or module. |
| Difficulty | Suggested difficulty level, such as Level 1, Level 2, or Level 3. |
| Estimated duration | Expected time for encounter, debrief, and reflection. |
| Clinical area | Topic area, such as urinary, respiratory, cardiac, mental health, or medication education. |
| Patient age | Patient age or age range. |
| Patient gender | Patient gender if educationally relevant. |
| Clinical setting | Setting such as outpatient clinic, urgent care, emergency department, inpatient unit, or telehealth. |
| Learning level | Intended learner stage, such as novice, early clinical, intermediate, or advanced. |
| Prerequisites | Prior concepts, sessions, or competencies expected before starting. |
| Unlock requirements | Any roadmap or progression requirements. |
| Badge | Badge or achievement associated with successful completion, if applicable. |

Faculty validation needed: Determine which metadata fields are required for every session and which are optional.

## Part 4: Competency Mapping

Every session should explicitly declare its competency targets.

Recommended structure:

```text
Session
  |
  +-- Primary Competencies
  |
  +-- Secondary Competencies
  |
  +-- Objectives
        |
        +-- Competency Links
        +-- Weight
        +-- Evidence Type
        +-- Safety Critical Flag
```

Primary competencies are the main educational focus. Secondary competencies may receive evidence but are not the central reason the session exists.

Each objective should map to one or more competencies:

| Objective | Competencies | Suggested Weight |
| --- | --- | ---: |
| Introduce yourself | Communication, Professionalism, Rapport | 1 |
| Obtain chief complaint | History Taking, Clinical Reasoning, Communication | 3 |
| Ask about symptom onset | History Taking, Clinical Reasoning | 2 |
| Ask about allergies | Safety, History Taking, Professionalism | 3 |
| Provide patient education | Patient Education, Communication, Safety | 3 |

Weights should reflect educational importance, not merely task difficulty. A safety-critical objective may need special handling even if it is a single question.

Authoring recommendations:

- Assign every objective at least one competency.
- Identify primary and secondary competencies before writing the full case.
- Mark safety-critical objectives clearly.
- Avoid objectives that cannot be observed.
- Keep objective language specific enough to assess.
- Review whether objective weights match faculty priorities.

Faculty validation needed: Confirm objective weights and safety-critical classifications before these mappings are used for scoring or longitudinal competency modeling.

## Part 5: Conversation Design

Clinical conversations should feel natural, but the underlying design should include expected phases.

Common conversation phases:

1. Greeting.
2. Rapport.
3. Chief complaint.
4. History of present illness.
5. Clarification.
6. Relevant background history.
7. Patient concerns or emotional cues.
8. Patient education.
9. Closing.
10. Debrief.

Not every case needs every phase. A brief medication counseling case may focus heavily on patient education and teach-back. A complex assessment case may emphasize history taking, clinical reasoning, and safety. A communication-focused case may include more emotional cues and fewer diagnostic tasks.

Conversation design should define:

- What the patient volunteers immediately.
- What information is hidden until the learner asks.
- Which cues should prompt empathy or clarification.
- Which red flags should be discoverable.
- What misconceptions or worries the patient may express.
- What education the student should provide.
- What closing behavior is expected.

Faculty validation needed: Ensure the patient conversation is clinically realistic and does not reward rote checklist behavior at the expense of therapeutic communication.

## Part 6: Expected Behaviors

Expected behaviors are observable student actions. They become measurable evidence when linked to objectives and competencies.

Examples:

- Introduces self and role.
- Uses the patient's name.
- Maintains rapport.
- Uses open-ended questions.
- Clarifies patient responses.
- Summarizes information.
- Explains next steps.
- Shows empathy.
- Uses lay language.
- Checks understanding.
- Identifies safety concerns.
- Avoids unsupported reassurance.
- Closes the encounter professionally.

Expected behaviors should be written so that faculty, AI evaluators, and future authoring tools can recognize them.

Strong behavior statement:

```text
Asks the patient to describe urinary symptoms in their own words before moving to focused questions.
```

Weak behavior statement:

```text
Does a good assessment.
```

Authoring recommendations:

- Use observable verbs.
- Avoid vague quality labels unless they are defined.
- Link behaviors to objectives and competencies.
- Include both required behaviors and optional excellence behaviors.
- Identify behaviors that should trigger remediation when missed.

## Part 7: Assessment

Assessment should connect session-level performance to longitudinal competency growth.

```text
Objectives
  |
  v
Evidence
  |
  v
Competencies
  |
  v
Session Score
  |
  v
Longitudinal Growth
```

The session score is one outcome, but it should not be the only educational meaning of the encounter. A student may earn an acceptable score while still needing focused practice in empathy, documentation, or safety. Another student may struggle on the first attempt but show meaningful growth after retrying.

Assessment should include:

- Objective completion.
- Quality of communication.
- Clinical relevance of questions.
- Safety-critical behaviors.
- Patient education quality.
- Evidence mapped to competencies.
- Feedback for improvement.

Rubric design principles:

- Make expectations explicit.
- Keep scoring explainable.
- Separate completion from quality when possible.
- Treat safety-critical misses seriously.
- Preserve evidence for competency growth.
- Support faculty review and override in future versions.

Faculty validation needed: Decide which objectives are required for passing, which contribute to score, and which contribute only to formative feedback.

## Part 8: Debrief

Debriefing should move beyond reporting a numeric score.

Less useful:

```text
You scored 84.
```

More useful:

```text
You demonstrated strong rapport and gathered the chief complaint clearly.
Your next growth area is medication and allergy history, which supports Safety and History Taking.
Try another urinary symptoms case or review medication history prompts before your next attempt.
```

A strong debrief should include:

- Strengths.
- Areas for improvement.
- Competencies demonstrated.
- Competencies needing practice.
- Specific missed objectives.
- Safety concerns, if any.
- Suggested next sessions.
- Reflection prompts.

Debrief principles:

- Be specific.
- Tie feedback to observed behaviors.
- Name competencies in plain language.
- Encourage retry and practice.
- Distinguish minor omissions from safety concerns.
- Give the learner a next action.

Faculty validation needed: Review debrief tone and wording to ensure it supports motivation while maintaining clinical seriousness.

## Part 9: AI Authoring

This session structure prepares Clinicals 2.0 for future AI-assisted case generation.

Eventually, an instructor might specify:

- Patient.
- Chief complaint.
- Difficulty.
- Primary competencies.
- Secondary competencies.
- Learning objectives.
- Clinical setting.
- Desired behaviors.
- Safety concerns.
- Debrief focus.

The AI authoring system could generate:

- Patient profile.
- Scenario summary.
- Conversation prompts.
- Hidden information.
- Patient emotional cues.
- Objective list.
- Competency mapping.
- Assessment rubric.
- Debrief.
- Reflection prompts.
- Faculty review notes.

AI authoring should not replace faculty judgment. It should accelerate draft creation while faculty validate clinical accuracy, educational alignment, safety, and tone.

Future AI safeguards:

- Require faculty review before publishing.
- Show competency mapping explicitly.
- Flag safety-critical objectives.
- Explain generated rubric criteria.
- Preserve edit history.
- Support local curriculum standards.

## Part 10: Worked Example: UTI Level 1

This example uses the existing UTI Level 1 patient concept as a faculty-readable authoring model. Exact implementation details may differ from the current app.

### Metadata

| Field | Example |
| --- | --- |
| Session ID | `uti_level1` |
| Title | UTI Level 1: Initial Patient Interview |
| Unit | Urinary and Renal Health |
| Difficulty | Level 1 |
| Estimated duration | 8-12 minutes encounter, 5 minutes debrief, 3 minutes reflection |
| Clinical area | Urinary symptoms, basic assessment, patient education |
| Patient age | Adult |
| Patient gender | Female, if aligned with current patient asset and case design |
| Clinical setting | Outpatient clinic or urgent care |
| Learning level | Novice or early clinical learner |
| Prerequisites | Basic therapeutic communication and introductory history taking |
| Unlock requirements | None or roadmap Level 1 unlock |
| Badge | UTI Level 1 completion badge, if currently configured |

Faculty validation needed: Confirm patient demographics, clinical setting, and whether gender is educationally relevant to the case.

### Scenario Summary

The patient presents with urinary discomfort and possible symptoms of an uncomplicated urinary tract infection. The learner should establish rapport, gather the chief complaint, ask focused urinary symptom questions, identify relevant safety concerns, and provide basic patient education or next-step guidance within scope.

### Primary Competencies

- History Taking.
- Communication.
- Clinical Reasoning.
- Safety.

### Secondary Competencies

- Rapport.
- Empathy.
- Patient Education.
- Professionalism.

### Learning Objectives

| Objective | Competency Mapping | Weight | Notes |
| --- | --- | ---: | --- |
| Introduce self and role | Communication, Professionalism, Rapport | 1 | Establishes professional opening. |
| Ask the patient to describe the concern | History Taking, Communication, Clinical Reasoning | 3 | Should elicit chief complaint in patient's words. |
| Ask about onset and duration | History Taking, Clinical Reasoning | 2 | Supports symptom characterization. |
| Ask about pain, burning, urgency, frequency, or other urinary symptoms | History Taking, Clinical Reasoning | 3 | Core UTI symptom assessment. |
| Ask about fever, flank pain, pregnancy, or worsening symptoms if appropriate | Safety, Clinical Reasoning, History Taking | 4 | Safety-critical red-flag screening. |
| Ask about allergies and medications | Safety, History Taking, Professionalism | 3 | Supports safe next steps. |
| Respond empathetically to discomfort or worry | Empathy, Rapport, Communication | 2 | Should not dismiss symptoms. |
| Explain likely next steps in lay language | Patient Education, Communication, Safety | 3 | Should stay within learner scope. |
| Check understanding and invite questions | Patient Education, Shared Decision Making, Communication | 2 | Supports patient-centered closure. |
| Close professionally | Professionalism, Communication, Rapport | 1 | Summarizes and ends respectfully. |

Faculty validation needed: Confirm red-flag list, objective weights, and scope-appropriate patient education.

### Conversation Flow

1. Greeting: Student introduces self and role.
2. Rapport: Student acknowledges the patient's discomfort or concern.
3. Chief complaint: Student asks what brought the patient in.
4. History of present illness: Student explores urinary symptoms, onset, duration, severity, and related symptoms.
5. Clarification: Student asks focused follow-up questions based on patient responses.
6. Safety screening: Student asks about fever, flank pain, pregnancy status when appropriate, allergies, medications, and worsening symptoms.
7. Patient education: Student explains likely next steps, hydration or symptom guidance if appropriate, and when to seek urgent care.
8. Closing: Student summarizes, checks understanding, and invites questions.
9. Debrief: System or faculty explains strengths, missed objectives, and competency evidence.

### Expected Behaviors

- Uses a calm, respectful tone.
- Lets the patient describe symptoms before narrowing questions.
- Avoids medical jargon when educating.
- Notices and responds to discomfort.
- Screens for safety concerns.
- Does not provide unsafe definitive diagnosis or medication advice outside scope.
- Summarizes what was learned.
- Gives clear next-step guidance.

### Competency Mapping Summary

| Competency | Evidence Sources |
| --- | --- |
| Communication | Introduction, open-ended question, lay explanation, closing summary. |
| Rapport | Greeting, use of respectful tone, response to patient discomfort. |
| Empathy | Acknowledgement of pain, worry, or embarrassment. |
| Professionalism | Role clarity, respectful boundaries, safe closure. |
| History Taking | Chief complaint, urinary symptoms, onset, duration, allergies, medications. |
| Clinical Reasoning | Follow-up questions, red-flag screening, symptom pattern recognition. |
| Patient Education | Next-step explanation, teach-back or understanding check. |
| Safety | Fever/flank pain screening, allergy and medication history, urgent-care guidance. |

### Rubric Summary

Suggested rubric categories:

- Opening and rapport: 10%.
- Chief complaint and urinary history: 25%.
- Focused clinical reasoning: 20%.
- Safety screening: 20%.
- Patient education and closing: 15%.
- Communication quality: 10%.

Safety-critical consideration: Missing key red-flag screening may require targeted remediation even if other portions are strong.

Faculty validation needed: Confirm whether safety screening should be a pass requirement for this session.

### Debrief Summary

Strong debrief topics:

- What the learner did well in opening the conversation.
- Whether the chief complaint was elicited clearly.
- Which urinary symptom questions were completed or missed.
- Whether red flags were assessed.
- How clearly next steps were explained.
- Which competencies received evidence.

Example debrief language:

```text
You built rapport by opening respectfully and allowing the patient to describe her symptoms.
You gathered several important urinary symptoms. Your next growth area is Safety: remember to ask about fever, flank pain, allergies, and medications before closing.
For your next attempt, focus on red-flag screening and explaining next steps in patient-friendly language.
```

### Reflection Prompts

- What question helped you understand the patient's main concern?
- Which symptom question did you almost forget?
- How did you respond to the patient's discomfort or worry?
- What safety concern would make this case more urgent?
- What would you explain differently if you repeated the encounter?

## Part 11: Authoring Checklist

Before publishing a Clinicals session, instructors and designers should confirm:

- [ ] Competencies identified.
- [ ] Primary competencies distinguished from secondary competencies.
- [ ] Objectives written as observable behaviors.
- [ ] Objectives mapped to competencies.
- [ ] Objective weights assigned and reviewed.
- [ ] Safety-critical objectives marked.
- [ ] Conversation flow defined.
- [ ] Hidden patient information identified.
- [ ] Patient emotional cues defined.
- [ ] Expected behaviors written.
- [ ] Assessment rubric completed.
- [ ] Debrief prepared.
- [ ] Reflection questions written.
- [ ] Difficulty validated.
- [ ] Clinical accuracy reviewed.
- [ ] Student-facing language reviewed.
- [ ] Faculty notes included.
- [ ] Faculty review completed.

## Part 12: Future Extensions

Future versions of the Session Authoring Framework may support:

- Multi-patient scenarios.
- Interprofessional simulations.
- Family members or caregivers.
- Medical interpreters.
- Team-based care.
- Adaptive branching.
- Dynamic patient states.
- AI-generated cases.
- Competency-aware AI patients.
- Faculty-customized rubrics.
- Local curriculum mapping.
- Research study variants.
- Multi-session competency arcs.
- Remediation-specific microcases.

These extensions should preserve the same educational spine:

```text
Session Design
  |
  v
Observable Behaviors
  |
  v
Competency Evidence
  |
  v
Learner Growth
```

## Open Questions for Faculty

1. Which metadata fields should be required for every session?
2. How should difficulty be defined: clinical complexity, communication complexity, reasoning demand, or all three?
3. Which competency domains should every session include by default?
4. How many objectives are appropriate for a Level 1 case?
5. Which objectives should be safety-critical?
6. Should safety-critical misses cap the session score or trigger remediation separately?
7. What level of patient education is appropriate for early learners?
8. How should retry behavior be reflected in debrief and growth evidence?
9. What should faculty review before a session can be published?
10. How much AI-generated authoring should be allowed before human review?
11. What student-facing language best supports confidence and accountability?
12. How should session authoring align with course outcomes and accreditation language?

## Recommended Next Step

Use this framework to review one existing Clinicals session with nursing faculty. The recommended pilot review is UTI Level 1 because it is familiar, focused, and already aligned with foundational communication, history taking, safety, and patient education behaviors.

After faculty review, the next artifact should be a reusable session authoring template that instructors can complete for every new case.
