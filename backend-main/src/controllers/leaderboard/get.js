const { TestScore, User } = require("../../models");
const { Op } = require("sequelize");
const db = require("../../config/db");

const getV1 = async (req, res, next) => {
  try {
    const { period, subjectId, limit } = req.query;
    const where = {};
    if (subjectId) where.subjectId = subjectId;

    if (period === "daily") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      where.createdAt = { [Op.gte]: today };
    } else if (period === "weekly") {
      const week = new Date(); week.setDate(week.getDate() - 7);
      where.createdAt = { [Op.gte]: week };
    }

    const scores = await TestScore.findAll({
      where,
      attributes: ["userId", [db.fn("SUM", db.col("score")), "totalScore"], [db.fn("SUM", db.col("xp")), "totalXP"], [db.fn("COUNT", db.col("TestScore.id")), "testsPlayed"], [db.fn("AVG", db.col("percentage")), "avgPercentage"]],
      include: [{ model: User, attributes: ["id", "name", "email", "profilePicture"] }],
      group: ["userId", "User.id"],
      order: [[db.fn("SUM", db.col("score")), "DESC"]],
      limit: parseInt(limit) || 20,
    });

    const leaderboard = scores.map((s, i) => ({ rank: i + 1, ...s.toJSON() }));
    return res.status(200).json({ message: "Leaderboard", data: leaderboard });
  } catch (error) { next(error); }
};
module.exports = getV1;
