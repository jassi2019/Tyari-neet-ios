const { Question } = require("../../models");

const createV1 = async (req, res, next) => {
  try {
    const { text, questionType, optionA, optionB, optionC, optionD, correctOption, correctAnswer, matchPairs, explanation, difficulty, marks, sequence, chapterId, subjectId, classId } = req.body;

    if (!text || !chapterId || !subjectId || !classId) {
      return res.status(400).json({ message: "text, chapterId, subjectId, classId required" });
    }

    const doc = await Question.create({
      text,
      questionType: questionType || "MCQ",
      optionA: optionA || null,
      optionB: optionB || null,
      optionC: optionC || null,
      optionD: optionD || null,
      correctOption: correctOption || null,
      correctAnswer: correctAnswer || null,
      matchPairs: matchPairs || null,
      explanation: explanation || null,
      difficulty: difficulty || "MEDIUM",
      marks: marks || "+4 / -1",
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