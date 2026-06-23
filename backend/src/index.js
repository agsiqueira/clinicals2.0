const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const casesRouter = require("./routes/cases");
const chatRouter = require("./routes/chat");
const gradeRouter = require("./routes/grade");
const conversationsRouter = require("./routes/conversations");
const voiceRouter = require("./routes/voice");
const progressRouter = require("./routes/progress");
const { syncAllCases } = require("./utils/caseSync");

dotenv.config();

const app = express();
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use("/api/cases", casesRouter);
app.use("/api/chat", chatRouter);
app.use("/api/grade", gradeRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/voice", voiceRouter);
app.use("/api/progress", progressRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Clinicals backend listening on port ${port}`);
  syncAllCases()
    .then((count) => console.log(`Synced ${count} cases into database`))
    .catch((err) => console.error("Case sync failed:", err));
});
