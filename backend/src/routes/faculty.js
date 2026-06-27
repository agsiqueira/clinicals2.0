const express = require("express");

const {
  buildFacultyDashboard,
  buildFacultyDashboardCsv,
  buildFacultyStudentDetail,
  buildFacultyStudentDetailCsv,
} = require("../services/facultyDashboard");

const router = express.Router();

router.get("/dashboard", async (_req, res, next) => {
  try {
    // TODO: Enforce role-based faculty access when user roles exist.
    const dashboard = await buildFacultyDashboard();
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

router.get("/dashboard/export.csv", async (_req, res, next) => {
  try {
    // TODO: Enforce role-based faculty access when user roles exist.
    const dashboard = await buildFacultyDashboard();
    const csv = buildFacultyDashboardCsv(dashboard);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="faculty-dashboard.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get("/students/:studentId", async (req, res, next) => {
  try {
    // TODO: Enforce role-based faculty access when user roles exist.
    const detail = await buildFacultyStudentDetail(req.params.studentId);
    if (!detail) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.get("/students/:studentId/export.csv", async (req, res, next) => {
  try {
    // TODO: Enforce role-based faculty access when user roles exist.
    const detail = await buildFacultyStudentDetail(req.params.studentId);
    if (!detail) {
      res.status(404).json({ error: "Student not found" });
      return;
    }
    const csv = buildFacultyStudentDetailCsv(detail);
    const filename = `faculty-student-${req.params.studentId}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
