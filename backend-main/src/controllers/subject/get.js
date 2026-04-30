const { Subject, Chapter } = require("../../models");

const getV1 = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      order: [["name", "ASC"]],
    });

    const counts = await Chapter.findAll({
      attributes: [
        "subjectId",
        [require("sequelize").fn("COUNT", require("sequelize").col("id")), "chapterCount"],
      ],
      group: ["subjectId"],
      raw: true,
    });

    const countMap = {};
    counts.forEach((c) => {
      countMap[c.subjectId] = parseInt(c.chapterCount, 10);
    });

    const data = subjects.map((s) => ({
      ...s.toJSON(),
      chapterCount: countMap[s.id] || 0,
    }));

    return res.status(200).json({ message: "Subjects fetched successfully", data });
  } catch (error) {
    next(error);
  }
};

module.exports = getV1;
