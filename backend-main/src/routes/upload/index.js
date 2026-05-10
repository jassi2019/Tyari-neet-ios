const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();
const upload = require("../../config/upload");
const authMiddleware = require("../../middlewares/auth");
const { isAdminRole } = require("../../middlewares/auth.z");

/**
 * POST /api/v1/uploads
 * Upload a PDF file (admin only)
 */
router.post(
  "/",
  authMiddleware,
  isAdminRole,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File too large. Maximum size is 50MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded. Please select a PDF file." });
    }

    const proto = req.get("x-forwarded-proto") || req.protocol;
    const url = `${proto}://${req.get("host")}/uploads/${req.file.filename}`;

    // Convert PDF to HTML images
    const { execSync } = require("child_process");
    const htmlDir = req.file.filename.replace(".pdf", "");
    const htmlPath = path.resolve(__dirname, "../../../uploads", htmlDir);
    try {
      require("fs").mkdirSync(htmlPath, { recursive: true });
      execSync(`pdftoppm -png -r 200 "${req.file.path}" "${htmlPath}/page"`);
      const pages = require("fs").readdirSync(htmlPath).filter(f => f.endsWith(".png")).sort();
      const htmlContent = pages.map((p, i) => `<img src="/uploads/${htmlDir}/${p}" style="width:100%;display:block;margin:0;padding:0;" />`).join("");
      const fullHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;-webkit-user-select:none;user-select:none;}body{background:#fff;}img{width:100%;display:block;}@media print{body{display:none!important;}}</style><script>document.addEventListener("contextmenu",e=>e.preventDefault());document.addEventListener("copy",e=>e.preventDefault());</script></head><body>${htmlContent}</body></html>`;
      require("fs").writeFileSync(path.resolve(htmlPath, "index.html"), fullHtml);
    } catch (convErr) {
      console.warn("PDF to HTML conversion failed:", convErr.message);
    }

    const htmlUrl = `${proto}://${req.get("host")}/uploads/${htmlDir}/index.html`;

    return res.status(201).json({
      message: "File uploaded successfully",
      data: {
        url,
        htmlUrl: htmlUrl || url,
        originalName: req.file.originalname,
        size: req.file.size,
        filename: req.file.filename,
      },
    });
  }
);

/**
 * DELETE /api/v1/uploads/:filename
 * Delete an uploaded file (admin only)
 */
router.delete(
  "/:filename",
  authMiddleware,
  isAdminRole,
  (req, res) => {
    const { filename } = req.params;
    const filePath = path.resolve(__dirname, "../../../uploads", filename);

    // Prevent path traversal
    const uploadsDir = path.resolve(__dirname, "../../../uploads");
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "File deleted successfully" });
  }
);

module.exports = router;
