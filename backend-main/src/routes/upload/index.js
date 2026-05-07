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

    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    return res.status(201).json({
      message: "File uploaded successfully",
      data: {
        url,
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
