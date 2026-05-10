const { TestScore, Subject, Chapter } = require("../../models");

const myV1 = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const scores = await TestScore.findAll({
      where: { userId },
      include: [{ model: Subject, attributes: ["id", "name"] }, { model: Chapter, attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    return res.status(200).json({ message: "My scores", data: scores });
  } catch (error) { next(error); }
};
module.exports = myV1;
