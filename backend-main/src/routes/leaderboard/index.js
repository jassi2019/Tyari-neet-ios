const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth");
const submitV1 = require("../../controllers/leaderboard/submit");
const getV1 = require("../../controllers/leaderboard/get");
const myV1 = require("../../controllers/leaderboard/my");

router.route("/").get(getV1).post(authMiddleware, submitV1);
router.route("/my").get(authMiddleware, myV1);

module.exports = router;
