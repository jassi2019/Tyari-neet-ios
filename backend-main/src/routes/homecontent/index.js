const express = require("express");
const router = express.Router();

const createV1 = require("../../controllers/homecontent/create");
const getV1 = require("../../controllers/homecontent/get");
const getAllV1 = require("../../controllers/homecontent/get.all");
const updateV1 = require("../../controllers/homecontent/update");
const deleteV1 = require("../../controllers/homecontent/delete");

const authMiddleware = require("../../middlewares/auth");
const { isAdminRole } = require("../../middlewares/auth.z");

// GET  /api/v1/home-content          — app fetches active content (public, no auth needed)
// POST /api/v1/home-content          — admin creates
router
  .route("/")
  .get(getV1)
  .post(authMiddleware, isAdminRole, createV1);

// GET  /api/v1/home-content/all      — admin fetches ALL (including inactive)
router.get("/all", authMiddleware, isAdminRole, getAllV1);

// PUT    /api/v1/home-content/:id    — admin edits
// DELETE /api/v1/home-content/:id    — admin deletes
router
  .route("/:id")
  .put(authMiddleware, isAdminRole, updateV1)
  .delete(authMiddleware, isAdminRole, deleteV1);

module.exports = router;
