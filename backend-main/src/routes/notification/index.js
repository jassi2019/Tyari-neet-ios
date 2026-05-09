const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth");
const { isAdminRole } = require("../../middlewares/auth.z");
const createV1 = require("../../controllers/notification/create");
const getV1 = require("../../controllers/notification/get");
const getAllV1 = require("../../controllers/notification/get.all");
const markReadV1 = require("../../controllers/notification/read");
const deleteV1 = require("../../controllers/notification/delete");

router.route("/").get(authMiddleware, getV1).post(authMiddleware, isAdminRole, createV1);
router.route("/all").get(authMiddleware, isAdminRole, getAllV1);
router.route("/:id/read").put(authMiddleware, markReadV1);
router.route("/:id").delete(authMiddleware, isAdminRole, deleteV1);

module.exports = router;
