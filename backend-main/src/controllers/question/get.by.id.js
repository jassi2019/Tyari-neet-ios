const { Question, Chapter, Subject, Class } = require("../../models");

const getByIdV1 = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const doc = await Question.findByPk(questionId, {
      include: [
        { model: Chapter, attributes: ["id", "name", "number"] },
        { model: Subject, attributes: ["id", "name"] },
        { model: Class, attributes: ["id", "name"] },
      ],
    });

    if (!doc) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.status(200).json({ message: "Question fetched successfully", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = getByIdV1;
