const { Question } = require("../../models");

const updateV1 = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const {
      text,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation,
      difficulty,
      marks,
      sequence,
      chapterId,
      subjectId,
      classId,
    } = req.body;

    const doc = await Question.findByPk(questionId);
    if (!doc) {
      return res.status(404).json({ message: "Question not found" });
    }

    await doc.update({
      ...(text !== undefined && { text }),
      ...(optionA !== undefined && { optionA }),
      ...(optionB !== undefined && { optionB }),
      ...(optionC !== undefined && { optionC }),
      ...(optionD !== undefined && { optionD }),
      ...(correctOption !== undefined && { correctOption }),
      ...(explanation !== undefined && { explanation }),
      ...(difficulty !== undefined && { difficulty }),
      ...(marks !== undefined && { marks }),
      ...(sequence !== undefined && { sequence }),
      ...(chapterId !== undefined && { chapterId }),
      ...(subjectId !== undefined && { subjectId }),
      ...(classId !== undefined && { classId }),
    });

    return res.status(200).json({ message: "Question updated successfully", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = updateV1;
