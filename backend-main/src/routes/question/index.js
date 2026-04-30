const express = require("express");
const router = express.Router();

const createV1    = require("../../controllers/question/create");
const getV1       = require("../../controllers/question/get");
const getByIdV1   = require("../../controllers/question/get.by.id");
const updateV1    = require("../../controllers/question/update");
const deleteV1    = require("../../controllers/question/delete");

const authMiddleware = require("../../middlewares/auth");
const { isAdminRole } = require("../../middlewares/auth.z");

// GET  /api/v1/questions?chapterId=&subjectId=&classId=  — app fetches questions for a test
// POST /api/v1/questions                                  — admin creates a question
router
  .route("/")
  .get(authMiddleware, getV1)
  .post(authMiddleware, isAdminRole, createV1);

// GET    /api/v1/questions/:questionId  — single question
// PUT    /api/v1/questions/:questionId  — admin edits
// DELETE /api/v1/questions/:questionId  — admin deletes
router
  .route("/:questionId")
  .get(authMiddleware, getByIdV1)
  .put(authMiddleware, isAdminRole, updateV1)
  .delete(authMiddleware, isAdminRole, deleteV1);

module.exports = router;
