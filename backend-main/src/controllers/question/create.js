const { Question } = require("../../models");

const createV1 = async (req, res, next) => {
  try {
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

    const doc = await Question.create({
      text,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      explanation: explanation || null,
      difficulty: difficulty || "MEDIUM",
      marks: marks || "+4 / −1",
      sequence: sequence || 1,
      chapterId,
      subjectId,
      classId,
    });

    return res.status(201).json({ message: "Question created successfully", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = createV1;
