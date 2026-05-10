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
      attributes: [
        "userId",
        [db.fn("SUM", db.col("TestScore.score")), "totalScore"],
        [db.fn("SUM", db.col("TestScore.xp")), "totalXP"],
        [db.fn("COUNT", db.col("TestScore.id")), "testsPlayed"],
        [db.fn("AVG", db.col("TestScore.percentage")), "avgPercentage"],
      ],
      include: [{ model: User, attributes: ["id", "name", "email", "profilePicture"] }],
      group: ["TestScore.userId", "User.id"],
      order: [[db.fn("SUM", db.col("TestScore.score")), "DESC"]],
      limit: parseInt(limit) || 20,
      raw: true,
      nest: true,
    });

    const leaderboard = scores.map((s, i) => ({ rank: i + 1, ...s }));
    return res.status(200).json({ message: "Leaderboard", data: leaderboard });
  } catch (error) { next(error); }
};
module.exports = getV1;