const { Question, Chapter, Subject, Class } = require("../../models");

const getV1 = async (req, res, next) => {
  try {
    const { chapterId, subjectId, classId } = req.query;

    const query = {};
    if (chapterId) query.chapterId = chapterId;
    if (subjectId) query.subjectId = subjectId;
    if (classId) query.classId = classId;

    const docs = await Question.findAll({
      where: query,
      order: [["sequence", "ASC"]],
      include: [
        { model: Chapter, attributes: ["id", "name", "number"], required: true },
        { model: Subject, attributes: ["id", "name"], required: true },
        { model: Class, attributes: ["id", "name"], required: true },
      ],
    });

    return res.status(200).json({ message: "Questions fetched successfully", data: docs });
  } catch (error) {
    next(error);
  }
};

module.exports = getV1;
