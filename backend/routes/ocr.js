const express = require("express");
const router = express.Router();
const mlAxios = require("../utils/axiosML");
const multer = require("multer");
const { verifyToken } = require("../middleware/auth");
const { db } = require("../config/firebase");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/PNG/WEBP images allowed"));
    }
  },
});

// POST /api/ocr/extract
router.post(
  "/extract",
  verifyToken,
  upload.single("prescription_image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    try {
      // Convert buffer to base64
      const base64Image = req.file.buffer.toString("base64");
      const language = req.body.language || "auto";

      // Call ML API using mlAxios utility
      const mlResponse = await mlAxios.post("/ocr", {
        image_b64: base64Image,
        language: language,
      });

      const ocrData = mlResponse.data;

      // Log to Firestore (async, don't await)
      db.collection("ocrLogs")
        .add({
          userId: req.user.uid,
          engine: ocrData.engine,
          language: ocrData.language,
          charCount: ocrData.charCount,
          success: ocrData.success,
          timestamp: new Date().toISOString(),
        })
        .catch(console.error);

      return res.json({
        extractedText: ocrData.extractedText,
        cleanedText: ocrData.cleanedText,
        engine: ocrData.engine,
        language: ocrData.language,
        confidence: ocrData.confidence,
        charCount: ocrData.charCount,
        success: ocrData.success,
        structuredDrugs: ocrData.structuredDrugs || [],
        patientInfo: ocrData.patientInfo || null,
      });
    } catch (err) {
      console.error("OCR extract error:", err.message);

      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        return res.status(503).json({ error: "ML service is offline. Please retry in 30-60 seconds.", code: "ML_OFFLINE" });
      }

      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        return res.status(504).json({ error: "ML service timed out. Please retry.", code: "ML_TIMEOUT" });
      }

      return res.status(500).json({
        error: err.response?.data?.detail || err.message || "OCR failed",
      });
    }
  },
);

// POST /api/ocr/analyze
// Accepts image + patientData, returns OCR result + full analysis
router.post(
  "/analyze",
  verifyToken,
  upload.single("prescription_image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    try {
      const base64Image = req.file.buffer.toString("base64");
      const language = req.body.language || "english";

      // Step 1: OCR
      console.log(`🔍 OCR analyze - Language: ${language}`);
      const ocrResponse = await mlAxios.post("/ocr", {
        image_b64: base64Image,
        language: language,
      }, { timeout: 120000 });
      const ocrData = ocrResponse.data;

      // Log the raw OCR data received from the ML service
      console.log("📄 Raw OCR Data from ML service:", JSON.stringify(ocrData, null, 2));

      console.log(`📊 OCR Result:`, {
        success: ocrData.success,
        engine: ocrData.engine,
        charCount: ocrData.charCount,
        drugsCount: ocrData.structuredDrugs?.length || 0,
        hasDrugs: !!ocrData.structuredDrugs?.length,
      });

      if (!ocrData.success || !ocrData.structuredDrugs?.length) {
        console.log(`⚠️ OCR failed or no drugs found`);
        return res.json({
          ocrSuccess: false,
          extractedText: ocrData.cleanedText || "",
          structuredDrugs: [],
          patientInfo: ocrData.patientInfo || null,
          analysis: null,
          message: "No drugs detected in image. Please check image quality.",
        });
      }

      // Step 2: Parse patient data from request body
      let patientData = {
        age: 40,
        gender: "Other", // Must be Male|Female|Other per ML API schema
        weight_kg: 70,
        diagnosis: [],
        allergies: [],
        current_medications: [],
        comorbidities: [],
      };
      if (req.body.patientData) {
        try {
          const parsed = JSON.parse(req.body.patientData);
          patientData = { ...patientData, ...parsed };
        } catch (e) {
          console.warn("Could not parse patientData from form body");
        }
      }

      // Step 3: Analyze using structured drugs directly
      console.log(`🔬 Analyzing ${ocrData.structuredDrugs.length} drugs...`);
      const analyzeResponse = await mlAxios.post("/analyze-from-ocr", {
        structuredDrugs: ocrData.structuredDrugs,
        rawText: ocrData.cleanedText || ocrData.extractedText || "",
        patientData: patientData,
      }, { timeout: 120000 });

      // Log the raw analysis data received from the ML service
      console.log("📈 Raw Analysis Data from ML service:", JSON.stringify(analyzeResponse.data, null, 2));

      console.log(`✅ Analysis complete:`, {
        status: analyzeResponse.data.status,
        errorsCount: analyzeResponse.data.errors?.length || 0,
        riskLevel: analyzeResponse.data.riskLevel,
      });

      return res.json({
        ocrSuccess: true,
        extractedText: ocrData.cleanedText || ocrData.extractedText,
        structuredDrugs: ocrData.structuredDrugs,
        patientInfo: ocrData.patientInfo || null,
        engine: ocrData.engine,
        charCount: ocrData.charCount,
        analysis: analyzeResponse.data,
      });
    } catch (err) {
      console.error("❌ OCR analyze error:", err.message);

      // ── ML service is down / sleeping (Render free tier cold start) ────────
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
        return res.status(503).json({
          error:
            "ML service is currently offline. Please wait 30–60 seconds and try again (Render free tier may be waking up).",
          code: "ML_OFFLINE",
        });
      }

      // ── Timeout (ML service too slow — model loading on cold start) ────────
      if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        return res.status(504).json({
          error:
            "ML service took too long to respond. This can happen on first request after inactivity. Please retry in 30 seconds.",
          code: "ML_TIMEOUT",
        });
      }

      // ── ML service returned an error response ──────────────────────────────
      if (err.response) {
        const status = err.response.status;
        const detail =
          err.response.data?.detail ||
          err.response.data?.error ||
          err.message;
        console.error("ML API Error Status:", status);
        console.error("ML API Error Data:", JSON.stringify(err.response.data, null, 2));

        // 422 = Validation error (bad input)
        if (status === 422) {
          return res.status(422).json({ error: `ML API validation error: ${detail}` });
        }

        return res.status(500).json({
          error: `ML service error (${status}): ${detail}`,
          code: "ML_ERROR",
        });
      }

      // ── Unknown error ──────────────────────────────────────────────────────
      console.error("Unhandled OCR error:", err);
      return res.status(500).json({
        error: err.message || "OCR analysis failed",
        code: "UNKNOWN",
      });
    }
  },
);

module.exports = router;
