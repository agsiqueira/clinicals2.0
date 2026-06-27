// Objective-to-competency links are configuration, not scoring logic.
// Future sessions can add objective ids here without changing routes,
// dashboards, badges, roadmap progression, or grading math.
const OBJECTIVE_COMPETENCY_MAPPINGS = {
  "formal-introduction": [
    { competencyId: "communication", weight: 2 },
    { competencyId: "professionalism", weight: 2 },
    { competencyId: "rapport", weight: 1 },
  ],
  introduces_self: [
    { competencyId: "communication", weight: 2 },
    { competencyId: "professionalism", weight: 2 },
    { competencyId: "rapport", weight: 1 },
  ],
  "chief-complaint": [
    { competencyId: "history_taking", weight: 3 },
    { competencyId: "communication", weight: 1 },
    { competencyId: "clinical_reasoning", weight: 2 },
  ],
  chief_complaint: [
    { competencyId: "history_taking", weight: 3 },
    { competencyId: "communication", weight: 1 },
    { competencyId: "clinical_reasoning", weight: 2 },
  ],
  open_ended_questions: [
    { competencyId: "communication", weight: 2 },
    { competencyId: "rapport", weight: 2 },
    { competencyId: "clinical_reasoning", weight: 1 },
  ],
  "hpi-summary": [
    { competencyId: "history_taking", weight: 3 },
    { competencyId: "clinical_reasoning", weight: 3 },
    { competencyId: "clinical_documentation", weight: 2 },
    { competencyId: "communication", weight: 1 },
  ],
  hpi_summary: [
    { competencyId: "history_taking", weight: 3 },
    { competencyId: "clinical_reasoning", weight: 3 },
    { competencyId: "clinical_documentation", weight: 2 },
    { competencyId: "communication", weight: 1 },
  ],
  patient_education: [
    { competencyId: "patient_education", weight: 3 },
    { competencyId: "communication", weight: 2 },
    { competencyId: "patient_safety", weight: 1 },
  ],
  safety_screening: [
    { competencyId: "patient_safety", weight: 4 },
    { competencyId: "clinical_reasoning", weight: 2 },
    { competencyId: "history_taking", weight: 1 },
  ],
};

module.exports = {
  OBJECTIVE_COMPETENCY_MAPPINGS,
};
