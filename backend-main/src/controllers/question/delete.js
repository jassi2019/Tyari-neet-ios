const { Question } = require("../../models");

const deleteV1 = async (req, res, next) => {
  try {
    const { questionId } = req.params;

    const doc = await Question.findByPk(questionId);
    if (!doc) {
      return res.status(404).json({ message: "Question not found" });
    }

    await Question.destroy({ where: { id: questionId } });

    return res.status(200).json({ message: "Question deleted successfully", data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = deleteV1;
