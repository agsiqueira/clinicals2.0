const prisma = require("../db/prisma");
const { listCases, loadCase } = require("./caseLoader");

async function upsertCaseFromJson(caseData) {
  if (!caseData) return null;
  const caseId = caseData.case_id;
  if (!caseId) return null;

  return prisma.case.upsert({
    where: { caseId },
    create: {
      caseId,
      title: caseData.display_title || caseId,
      level: Number(caseData.level) || 1,
      setting: caseData.setting || null,
      active: true
    },
    update: {
      title: caseData.display_title || caseId,
      level: Number(caseData.level) || 1,
      setting: caseData.setting || null,
      active: true
    }
  });
}

async function ensureCaseFromId(caseId) {
  const caseData = await loadCase(caseId);
  if (!caseData) return null;
  return upsertCaseFromJson(caseData);
}

async function syncAllCases() {
  const cases = await listCases();
  let count = 0;
  for (const item of cases) {
    const caseData = await loadCase(item.caseId);
    if (!caseData) continue;
    await upsertCaseFromJson(caseData);
    count += 1;
  }
  return count;
}

module.exports = {
  ensureCaseFromId,
  syncAllCases
};
