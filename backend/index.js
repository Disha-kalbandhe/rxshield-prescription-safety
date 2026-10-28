require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Initialize Firebase Admin early
require("./config/firebase");

const prescriptionRoutes = require("./routes/prescription");
const patientRoutes = require("./routes/patient");
const ocrRoutes = require("./routes/ocr");
const auditRoutes = require("./routes/audit");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
// CORS Configuration for production
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://localhost:3000", // Alternative dev port
  "http://localhost:4173", // Vite preview
  process.env.FRONTEND_URL, // Vercel production URL
  process.env.CLIENT_URL,   // Fallback (legacy)
].filter(Boolean);

// Patterns for dynamic/preview deployments
const allowedPatterns = [
  /^https:\/\/[\w-]+\.vercel\.app$/,   // any *.vercel.app (includes preview URLs)
  /^https:\/\/[\w-]+\.onrender\.com$/, // service-to-service on Render
  /^http:\/\/localhost:\d+$/,           // any localhost port (dev)
];

console.log("✅ CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check exact static list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Check pattern list (Vercel previews, Render internal, localhost)
      if (allowedPatterns.some((pattern) => pattern.test(origin))) {
        // Restrict localhost patterns to non-production only
        if (
          /^http:\/\/localhost/.test(origin) &&
          process.env.NODE_ENV === "production"
        ) {
          return callback(new Error(`CORS: Origin ${origin} not allowed in production`));
        }
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/prescription", prescriptionRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/audit", auditRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "RxShield API",
    mlApiUrl: process.env.ML_API_URL,
    timestamp: new Date().toISOString(),
  });
});

// Health check for Render (uses /api/health)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "RxShield Backend" });
});

// ML service status — probes ML service so frontend can show a warning
app.get("/api/ml-status", async (_req, res) => {
  const axios = require("axios");
  const mlUrl = process.env.ML_API_URL;
  if (!mlUrl) {
    return res.json({ status: "unconfigured", message: "ML_API_URL not set" });
  }
  try {
    const response = await axios.get(`${mlUrl}/health`, { timeout: 8000 });
    return res.json({ status: "ok", mlService: response.data });
  } catch (err) {
    if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
      return res.json({ status: "offline", message: "ML service is sleeping (Render free tier). First request will wake it up in ~60s." });
    }
    if (err.code === "ECONNABORTED") {
      return res.json({ status: "starting", message: "ML service is starting up. Please wait ~60 seconds." });
    }
    return res.json({ status: "error", message: err.message });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ RxShield server running on port ${PORT}`);
});
