type DisplayUnit = {
  slug?: string | null;
  title?: string | null;
  sortOrder?: number | null;
};

type DisplaySession = {
  slug?: string | null;
  title?: string | null;
};

type DisplayOverview = DisplaySession & {
  linkedCase?: {
    title?: string | null;
  } | null;
};

export const ROADMAP_SESSION_PATIENT_NAMES: Record<string, string> = {
  "first-patient": "Taylor Reed",
  "first-patient-hpi": "Taylor Reed",
  "seasonal-allergies-complete-hpi": "Sarah Johnson",
};

export const ROADMAP_SESSION_REASONS: Record<string, string> = {
  "first-patient": "Urinary Symptoms",
  "first-patient-hpi": "Urinary Symptoms",
  "seasonal-allergies-complete-hpi": "Seasonal Allergies",
};

const ROADMAP_SESSION_TASKS: Record<string, string> = {
  "first-patient": "Introduction & Chief Complaint",
  "first-patient-hpi": "Complete Clinical Encounter",
  "seasonal-allergies-complete-hpi": "Complete Clinical Encounter",
};

export function unitDisplayTitle(unit?: DisplayUnit | null) {
  const title = String(unit?.title || "").trim();
  if (unit?.slug === "unit-1-clinical-encounter") return "Unit 1: First Clinical Encounter";
  if (/^Unit\s+\d+\s*:/i.test(title)) return title;

  const sortOrder = Number(unit?.sortOrder);
  if (Number.isFinite(sortOrder) && sortOrder > 0) {
    return `Unit ${sortOrder}: ${title}`;
  }

  return title;
}

export function sessionDisplayTitle(session?: DisplaySession | null) {
  const slug = String(session?.slug || "");
  const patientName = ROADMAP_SESSION_PATIENT_NAMES[slug];
  const title = String(session?.title || "").replace(/Complete HPI/gi, "Complete Clinical Encounter");

  if (patientName && !title && ROADMAP_SESSION_TASKS[slug]) {
    return `${patientName}: ${ROADMAP_SESSION_TASKS[slug]}`;
  }
  if (!patientName) return title;
  if (/Introduction and Chief Complaint/i.test(title)) {
    return `${patientName}: Introduction & Chief Complaint`;
  }
  if (/Complete Clinical Encounter/i.test(title)) {
    return `${patientName}: Complete Clinical Encounter`;
  }

  return title.replace(/^First Patient:\s*/i, `${patientName}: `);
}

export function sessionDisplayParts(session?: DisplaySession | null) {
  const title = sessionDisplayTitle(session);
  const [patientName, ...taskParts] = title.split(":");
  const taskTitle = taskParts.join(":").trim();

  if (!taskTitle) {
    return {
      patientName: title,
      taskTitle: null,
      title,
    };
  }

  return {
    patientName: patientName.trim(),
    taskTitle,
    title,
  };
}

export function patientFacingText(value?: string | null) {
  return String(value || "")
    .replace(/Complete HPI/gi, "Complete Clinical Encounter")
    .replace(/HPI\b/g, "focused history");
}

export function overviewPatientName(overview?: DisplayOverview | null) {
  const slug = String(overview?.slug || "");
  return ROADMAP_SESSION_PATIENT_NAMES[slug] || "Patient";
}

export function overviewEncounterTitle(overview?: DisplayOverview | null) {
  const title = patientFacingText(overview?.title);
  if (/Introduction and Chief Complaint/i.test(title)) return "Introduction & Chief Complaint";
  if (/Complete Clinical Encounter/i.test(title)) return "Complete Clinical Encounter";
  return title
    .replace(/^First Patient:\s*/i, "")
    .replace(/^Seasonal Allergies:\s*/i, "");
}

export function overviewReasonForVisit(overview?: DisplayOverview | null) {
  const slug = String(overview?.slug || "");
  const mappedReason = ROADMAP_SESSION_REASONS[slug];
  if (mappedReason) return mappedReason;

  const caseTitle = overview?.linkedCase?.title?.trim();
  if (!caseTitle || /^Level\s+\d/i.test(caseTitle)) return null;
  return patientFacingText(caseTitle);
}
