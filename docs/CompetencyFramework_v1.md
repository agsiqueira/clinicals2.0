# Clinicals 2.0 Competency Framework v1

Status: Design draft for faculty review  
Scope: Educational architecture only  
Last updated: June 26, 2026

## Purpose

Clinicals 2.0 currently evaluates learners through encounter-specific signals: session scores, objectives, badge tiers, attempts, and roadmap progression. Those signals are useful, but they describe performance at a moment in time. The next phase should connect those moments into a longitudinal picture of learner growth.

This document proposes a first version of the Clinicals Competency Framework. It is intended to help faculty, product, research, and engineering teams discuss how completed clinical sessions can become evidence of competency development over time.

This is not an implementation specification. It does not change scoring, APIs, database schema, authentication, roadmap progression, or application behavior.

## Assumptions

- Clinicals 2.0 will continue to use session objectives, attempts, scores, and badge tiers as encounter-level evidence.
- A single objective may contribute to more than one competency.
- Competency scores should represent patterns over time, not a one-time grade.
- Early versions should be explainable to students and faculty.
- Faculty should be able to override, annotate, or validate AI-derived evidence in future versions.
- The framework should support nursing education, but this draft intentionally uses plain-language domains for review before final terminology is locked.

## Items Requiring Nursing Faculty Validation

- Domain names and definitions.
- Whether any domains should be merged, split, or removed.
- Observable behaviors for each domain.
- Suggested domain weights.
- Mastery level labels and score ranges.
- Whether competency growth should privilege recent performance, consistency, best performance, or faculty judgment.
- How competency information should be presented to students without discouraging practice and retry behavior.

## Part 1: Educational Philosophy

The central shift is from evaluating isolated encounters to evaluating evidence of development.

```text
Session
  |
  v
Evidence
  |
  v
Competency
  |
  v
Growth
  |
  v
Mastery
```

A session is a simulated clinical encounter. It creates observable learner actions: what the student asked, how they responded, whether they completed required objectives, how they educated the patient, and whether they demonstrated safe clinical judgment.

Evidence is the collection of measurable or reviewable signals produced by that session. Evidence may include objective completion, session score, AI feedback, retry behavior, reflection, faculty review, and conversation quality.

A competency is a durable capability that learners develop across multiple encounters. Communication, history taking, clinical reasoning, safety, and patient education are examples of competencies that cannot be fully understood from a single score.

Growth is the change in competency evidence over time. A student may begin with incomplete history taking, improve after feedback, and later demonstrate consistent performance across different cases.

Mastery is a pattern of reliable performance across contexts. Mastery should not mean a perfect score on one case. It should mean the learner repeatedly demonstrates the behaviors expected for that competency, with enough evidence to trust the conclusion.

This philosophy supports a more educationally useful feedback loop:

- Students understand what capabilities they are building.
- Faculty can identify who needs support and where.
- The system can recommend practice based on demonstrated needs.
- Researchers can study growth patterns rather than only final scores.

## Part 2: Competency Domains

The following domains are a first-pass model for discussion. Suggested weights are intentionally approximate. They can later vary by course, case type, level, or faculty preference.

### 1. Communication

Description: Uses clear, organized, patient-centered verbal and written communication.

Educational importance: Communication is foundational to assessment, education, safety, trust, and team-based care.

Observable behaviors:

- Introduces self and role clearly.
- Uses understandable language.
- Asks questions in a logical order.
- Avoids excessive jargon.
- Confirms patient understanding.
- Summarizes key information accurately.

Possible assessment evidence:

- Objective completion for introduction, chief complaint, symptom questions, and patient education.
- Conversation transcript quality.
- AI or faculty review of clarity and organization.
- Patient simulation response patterns.

Suggested weight: 12%

Faculty validation needed: Confirm whether communication should remain broad or be separated into therapeutic communication, clinical interviewing, and patient education.

### 2. Rapport

Description: Establishes a respectful, trusting, and collaborative relationship with the patient.

Educational importance: Rapport supports disclosure, adherence, patient satisfaction, and therapeutic presence.

Observable behaviors:

- Greets the patient respectfully.
- Uses the patient's name when appropriate.
- Acknowledges concerns.
- Maintains a warm, professional tone.
- Responds to patient cues.
- Avoids rushing or dismissing the patient.

Possible assessment evidence:

- Completion of rapport-building objectives.
- Conversation tone and response timing.
- Patient affect or engagement signals.
- Faculty review of interpersonal approach.

Suggested weight: 8%

Faculty validation needed: Determine whether rapport should be its own competency or part of communication/empathy.

### 3. Empathy

Description: Recognizes, validates, and responds appropriately to patient emotions and lived experience.

Educational importance: Empathy improves trust, supports patient-centered care, and helps students practice humane clinical presence.

Observable behaviors:

- Notices emotional cues.
- Validates patient concerns.
- Responds compassionately to fear, frustration, embarrassment, or uncertainty.
- Avoids minimizing symptoms or concerns.
- Balances empathy with clinical focus.

Possible assessment evidence:

- AI or faculty review of emotional cue responses.
- Objectives related to addressing concerns or reassurance.
- Transcript markers for validation and supportive statements.
- Reflection prompts about patient perspective.

Suggested weight: 8%

Faculty validation needed: Clarify how empathy should be assessed without rewarding scripted or performative language.

### 4. Professionalism

Description: Demonstrates ethical, respectful, accountable, and role-appropriate conduct.

Educational importance: Professionalism is essential to patient trust, interprofessional collaboration, confidentiality, and safe practice.

Observable behaviors:

- Identifies self and role.
- Maintains respectful boundaries.
- Uses appropriate tone.
- Avoids unsupported claims.
- Recognizes scope of practice.
- Documents accurately and honestly.

Possible assessment evidence:

- Objectives for introduction, consent, role clarity, and respectful closure.
- Faculty review.
- Conversation transcript analysis.
- Documentation quality.

Suggested weight: 10%

Faculty validation needed: Identify professionalism behaviors that should be required across all sessions.

### 5. History Taking

Description: Collects relevant subjective data using organized, comprehensive, and patient-centered questioning.

Educational importance: Strong history taking is the basis for assessment, clinical reasoning, prioritization, and safe decision making.

Observable behaviors:

- Obtains chief complaint.
- Explores symptom onset, location, duration, character, aggravating factors, relieving factors, and severity when relevant.
- Collects relevant medical, medication, allergy, family, and social history.
- Uses open-ended and focused questions appropriately.
- Avoids missing critical red flags.

Possible assessment evidence:

- Objective completion for required history elements.
- Transcript coverage of expected questions.
- AI evaluation of question sequence and relevance.
- Session score components.

Suggested weight: 15%

Faculty validation needed: Confirm whether history taking should be weighted more heavily in early-level cases.

### 6. Clinical Reasoning

Description: Interprets patient information, identifies relevant patterns, prioritizes concerns, and connects findings to appropriate next steps.

Educational importance: Clinical reasoning is central to safe practice and differentiates data collection from meaningful clinical judgment.

Observable behaviors:

- Connects symptoms to plausible concerns.
- Asks follow-up questions based on patient responses.
- Identifies red flags.
- Prioritizes important findings.
- Avoids premature closure.
- Explains reasoning when prompted.

Possible assessment evidence:

- Objective completion for key diagnostic or assessment questions.
- Score performance on reasoning-heavy objectives.
- AI evaluation of follow-up questions.
- Faculty review of case notes or reflection.
- Improvement across cases with similar reasoning patterns.

Suggested weight: 18%

Faculty validation needed: Determine how to assess reasoning separately from simply asking the correct checklist questions.

### 7. Patient Education

Description: Provides accurate, understandable, and actionable education tailored to the patient's needs.

Educational importance: Patient education supports self-management, adherence, safety, and shared understanding.

Observable behaviors:

- Explains findings or next steps in patient-friendly language.
- Gives relevant self-care or follow-up guidance.
- Checks understanding.
- Corrects misconceptions.
- Avoids overwhelming the patient.
- Provides safety-net instructions when appropriate.

Possible assessment evidence:

- Patient education objectives.
- Transcript review of explanations.
- Teach-back prompts.
- AI or faculty evaluation of accuracy and clarity.

Suggested weight: 10%

Faculty validation needed: Define case-specific education expectations and scope boundaries.

### 8. Safety

Description: Recognizes risks, escalates concerns, avoids unsafe advice, and supports patient protection.

Educational importance: Safety is a non-negotiable dimension of clinical performance and should influence competency interpretation even when other behaviors are strong.

Observable behaviors:

- Identifies urgent symptoms or red flags.
- Gives appropriate escalation or follow-up guidance.
- Avoids unsafe reassurance.
- Recognizes medication, allergy, infection, or fall risks when relevant.
- Maintains confidentiality and appropriate boundaries.

Possible assessment evidence:

- Safety-critical objectives.
- AI or faculty review of unsafe statements.
- Session pass/fail gates.
- Missed red-flag patterns over time.

Suggested weight: 12%

Faculty validation needed: Decide which safety behaviors should be gating requirements rather than weighted score contributors.

### 9. Clinical Documentation

Description: Records patient information accurately, concisely, and in a clinically useful structure.

Educational importance: Documentation supports continuity of care, legal accountability, communication, and clinical reasoning.

Observable behaviors:

- Captures key subjective and objective information.
- Separates patient-reported information from interpretation.
- Uses organized structure.
- Avoids unsupported conclusions.
- Includes relevant negatives when appropriate.

Possible assessment evidence:

- Documentation artifacts if available.
- Faculty review of submitted notes.
- AI evaluation of note completeness and accuracy.
- Alignment between conversation and documentation.

Suggested weight: 8%

Faculty validation needed: Determine whether documentation should be active in v1 if documentation tasks are not present in every session.

### 10. Shared Decision Making

Description: Involves the patient in care planning by acknowledging preferences, concerns, and readiness.

Educational importance: Shared decision making supports patient autonomy, adherence, and individualized care.

Observable behaviors:

- Asks about patient goals or concerns.
- Offers choices when appropriate.
- Checks readiness or barriers.
- Encourages questions.
- Collaborates rather than dictates.

Possible assessment evidence:

- Objectives for patient preferences, barriers, and teach-back.
- Transcript analysis.
- Faculty review.
- Patient simulation engagement.

Suggested weight: 7%

Faculty validation needed: Decide when this competency should apply, since not all early cases may include decision points.

## Part 3: Objectives Mapping

Objectives are encounter-level behaviors. Competencies are longitudinal capabilities. One objective may support multiple competencies, and one competency may draw evidence from many objectives across multiple sessions.

Example mappings:

| Objective | Primary Competencies | Secondary Competencies |
| --- | --- | --- |
| Introduces self | Communication, Professionalism | Rapport |
| Obtains chief complaint | History Taking, Clinical Reasoning | Communication |
| Uses open-ended questions | Communication, Rapport | Clinical Reasoning |
| Asks about symptom onset | History Taking | Clinical Reasoning |
| Asks about medication allergies | Safety, History Taking | Professionalism |
| Responds to patient anxiety | Empathy, Rapport | Communication |
| Provides UTI prevention education | Patient Education, Safety | Communication |
| Checks patient understanding | Patient Education, Shared Decision Making | Communication |
| Identifies red-flag symptoms | Safety, Clinical Reasoning | History Taking |
| Documents relevant findings | Clinical Documentation | Clinical Reasoning, Professionalism |

Future implementation should allow each objective to define:

- Primary competency links.
- Secondary competency links.
- Optional weights per competency.
- Whether the objective is safety-critical.
- Whether the objective is required, optional, or enrichment.

Faculty validation needed: Objective-to-competency mapping should be reviewed case by case with nursing faculty before it is used for formal learner modeling.

## Part 4: Competency Evidence

Competency growth should be based on multiple forms of evidence. Not all evidence should be weighted equally.

### Evidence Types

Session score: Provides a broad encounter-level performance signal. It is easy to understand but may hide strengths and weaknesses across domains.

Objective completion: Shows whether the learner completed specific expected behaviors. It maps naturally to competencies and is likely the best v1 evidence source.

Conversation quality: Captures how the learner communicated, not just whether they asked the correct question. This may require AI or faculty review.

Retry behavior: Can show persistence, self-correction, and learning after feedback. It should be interpreted carefully so students are not punished for practicing.

Consistency: Repeated performance across different cases is stronger evidence than a single high score.

Faculty review: Provides expert judgment, especially for professionalism, empathy, reasoning, and safety.

AI evaluation: May help scale qualitative assessment but should remain explainable and reviewable.

Reflection: May show metacognition, insight, and readiness for improvement.

### Evidence Weighting Principles

- Safety-critical evidence may need gating rules.
- Faculty-reviewed evidence should carry high confidence.
- Recent performance should matter, but earlier performance should not disappear.
- Repeated evidence across cases should increase confidence.
- Practice attempts should support growth rather than create permanent penalties.

## Part 5: Growth Model

Several models could convert evidence into competency growth.

### Simple Average

Description: Average all competency-linked evidence equally.

Pros:

- Easy to explain.
- Easy to implement.
- Stable and transparent.

Cons:

- Early poor performance can linger too long.
- Recent improvement is underrepresented.
- Does not distinguish high-confidence evidence from low-confidence evidence.

### Weighted Average

Description: Weight evidence by objective importance, competency relevance, source type, or case difficulty.

Pros:

- More educationally nuanced.
- Supports safety-critical and faculty-reviewed evidence.
- Allows some objectives to contribute more strongly than others.

Cons:

- Requires faculty agreement on weights.
- Can become difficult to explain.
- May create false precision if weights are not validated.

### Exponential Moving Average

Description: Recent evidence has more influence than older evidence.

Pros:

- Reflects learner growth.
- Encourages recovery after early struggle.
- Useful for adaptive recommendations.

Cons:

- More complex to explain.
- May overreact to a single recent attempt.
- Needs careful tuning.

### Recent Attempts Weighted More Heavily

Description: A simpler version of recency weighting, such as last three attempts count more than earlier attempts.

Pros:

- Easier to explain than a formal exponential model.
- Balances history with recent performance.
- Good fit for early implementation.

Cons:

- Still requires design choices.
- May underrepresent long-term consistency.

### Confidence Score

Description: Competency score is paired with a confidence estimate based on amount, quality, and diversity of evidence.

Pros:

- Separates performance from certainty.
- Prevents overinterpreting one attempt.
- Helps faculty know when more evidence is needed.

Cons:

- Adds another concept for users.
- Requires thoughtful UI and explanation.

### Recommended Version 1 Model

Use a weighted average with light recency emphasis and a separate confidence label.

Recommended v1 approach:

- Map objectives to competencies.
- Convert completed/missed objectives into competency evidence.
- Include session score as a secondary broad signal.
- Weight safety-critical objectives more strongly.
- Give the most recent three scored attempts modest additional weight.
- Display confidence as Low, Moderate, or High based on evidence count and diversity.

This model is explainable, supports growth, and avoids overengineering. It can later evolve into a more formal longitudinal learner model.

Faculty validation needed: Confirm whether recency should be emphasized and whether safety-critical behaviors should be weighted or gated.

## Part 6: Mastery Levels

Mastery levels should communicate growth without making students feel permanently labeled. They should be framed as current evidence levels, not fixed traits.

| Level | Suggested Range | Meaning |
| --- | ---: | --- |
| Novice | 0-49 | Limited evidence of consistent competency; needs structured support. |
| Developing | 50-69 | Demonstrates some expected behaviors but misses important elements. |
| Competent | 70-83 | Meets many expectations with occasional gaps or inconsistency. |
| Proficient | 84-91 | Consistently demonstrates expected behaviors across cases. |
| Advanced | 92-96 | Demonstrates strong performance with flexibility and reliability. |
| Mastery | 97-100 | Demonstrates exceptional, consistent performance across varied contexts. |

Recommended display principle: Pair each mastery level with confidence.

Example:

```text
Clinical Reasoning: Competent, Moderate Confidence
Communication: Proficient, High Confidence
Safety: Developing, Low Confidence
```

Faculty validation needed: Align ranges with existing badge tiers and nursing program expectations.

## Part 7: Recommendations

Competencies can eventually drive recommendations for students, faculty, and adaptive AI systems.

Examples:

- Recommend another communication-heavy case when communication evidence is low or inconsistent.
- Recommend empathy practice when emotional cues are missed.
- Recommend medication counseling practice when patient education and safety evidence are weak.
- Recommend faculty intervention when safety-critical objectives are repeatedly missed.
- Recommend reflection prompts when the student improves after retries.
- Recommend more advanced cases when a competency is proficient with high confidence.

Recommendation principles:

- Recommendations should be specific and actionable.
- Recommendations should explain the evidence behind the suggestion.
- Recommendations should distinguish practice needs from risk concerns.
- Students should see recommendations as coaching, not punishment.
- Faculty should be able to review or override recommendations.

## Part 8: Faculty Dashboard Information Architecture

Faculty should see competencies at both population and individual-student levels.

### Population View

Recommended sections:

- Competency overview by class.
- Distribution of mastery levels by competency.
- Competencies with the lowest average evidence.
- Competencies with low confidence due to limited attempts.
- Most frequently missed objectives mapped to competencies.
- Sessions contributing the strongest evidence gaps.
- Students who may need support by competency.

### Student Detail View

Recommended sections:

- Competency profile.
- Mastery level and confidence per competency.
- Recent evidence by competency.
- Missed objectives grouped by competency.
- Growth over time.
- Faculty notes or review status.
- Recommended next cases or remediation.

### Faculty Use Cases

- Identify class-wide teaching gaps.
- Find students who need early intervention.
- Compare competency patterns across sessions.
- Prepare debriefing topics.
- Support research analysis.
- Document learner growth over time.

Faculty validation needed: Determine which views are most useful for instructors during active teaching versus end-of-course review.

## Part 9: Student Dashboard Information Architecture

Students should see competencies as a growth map, not a deficit report.

### Recommended Student-Facing Sections

- My Competency Growth.
- Strengths to keep building.
- Focus areas for next practice.
- Recent evidence.
- Suggested next sessions.
- Reflection prompts.
- Badge and mastery progress.

### Motivation Principles

- Use encouraging language.
- Show improvement, not only current level.
- Highlight effort and retry learning.
- Avoid ranking students against peers.
- Explain why a recommendation appears.
- Keep safety feedback clear and serious without being shaming.

Example student-facing language:

```text
You are building consistency in History Taking.
Your recent attempts show stronger symptom follow-up questions.
Next focus: remember to ask about allergies and medication history.
```

Faculty validation needed: Review student-facing language to ensure it supports motivation and clinical accountability.

## Part 10: Future AI

The competency model can become a shared foundation for future AI features.

### Adaptive Preceptor

The AI preceptor could tailor coaching based on competency evidence:

- More supportive scaffolding for novice or low-confidence areas.
- More challenging questions for proficient areas.
- Specific feedback tied to observable behaviors.
- Follow-up prompts after missed safety or reasoning objectives.

### Adaptive Case Sequencing

The system could recommend cases based on competency needs:

- Communication-heavy cases for communication growth.
- Complex histories for clinical reasoning and history taking.
- Education-focused cases for patient teaching.
- Safety-critical cases once prerequisites are met.

### Automatic Remediation

The system could generate targeted practice:

- Micro-scenarios for a missed objective.
- Short reflection prompts.
- Focused patient education exercises.
- Repeat encounters with changed patient details.

### Automatic Case Generation

Future case authoring could use competency targets:

- Generate objectives mapped to selected competencies.
- Balance evidence across domains.
- Create cases with specific safety or reasoning challenges.
- Ensure each case contributes to the longitudinal learner model.

### Research Analytics

Competency data can support research questions:

- Which competencies improve fastest with repeated simulation?
- Which objectives predict later success?
- Which cases produce the strongest growth?
- How does retry behavior relate to mastery?
- Which feedback patterns support improvement?

Future validation needed: Any AI-derived competency evidence should be reviewed for fairness, explainability, consistency, and alignment with nursing education standards.

## Open Questions for Faculty

1. Which competency domains should be included in v1?
2. Are any domains missing, redundant, or named incorrectly?
3. Should safety be a weighted competency, a gating requirement, or both?
4. Which objectives should map to multiple competencies?
5. How much should recent performance matter compared with all historical attempts?
6. Should retry behavior increase confidence, show growth, or affect score?
7. What mastery level labels feel appropriate for students?
8. Should competency levels be shown to students immediately, or only after enough evidence exists?
9. What minimum evidence should be required before displaying a competency level?
10. Which competency insights are most useful for faculty during live teaching?
11. Which insights are most useful for end-of-course evaluation?
12. How should faculty review or override AI-generated evidence?
13. Which competencies should be emphasized for early learners versus advanced learners?
14. How should competency reporting align with program outcomes or accreditation language?
15. What student-facing language best encourages practice while maintaining clinical seriousness?

## Recommended Next Step

Review this draft with nursing faculty and mark each competency as:

- Keep.
- Rename.
- Merge.
- Split.
- Remove.
- Needs evidence definition.
- Needs objective mapping.

After faculty review, the next design artifact should be an objective-to-competency mapping table for the existing Clinicals 2.0 sessions.
