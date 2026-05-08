const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth");
const { isAdminRole } = require("../../middlewares/auth.z");
const createV1 = require("../../controllers/featurecontent/create");
const getV1 = require("../../controllers/featurecontent/get");
const updateV1 = require("../../controllers/featurecontent/update");
const deleteV1 = require("../../controllers/featurecontent/delete");

router.route("/").get(getV1).post(authMiddleware, isAdminRole, createV1);
router.route("/:id").put(authMiddleware, isAdminRole, updateV1).delete(authMiddleware, isAdminRole, deleteV1);

module.exports = router;
