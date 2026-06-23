function sanitizeCase(caseData) {
  if (!caseData || typeof caseData !== "object") {
    return caseData;
  }
  const { 
    hidden_truth, 
    rubric,
    answer_key,
    model_answer,
    ...safeCase 
  } = caseData;
  return safeCase;
}

module.exports = { sanitizeCase };
