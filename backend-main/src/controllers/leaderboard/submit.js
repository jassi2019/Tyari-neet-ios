const { TestScore } = require("../../models");

const submitV1 = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subjectId, chapterId, classId, testType, questionType, totalQuestions, correctAnswers, wrongAnswers, skipped, score, percentage, timeTaken, xp } = req.body;
    if (!totalQuestions) return res.status(400).json({ message: "totalQuestions required" });
    const doc = await TestScore.create({ userId, subjectId, chapterId, classId, testType: testType || "daily", questionType: questionType || "MCQ", totalQuestions, correctAnswers, wrongAnswers, skipped: skipped || 0, score: score || 0, percentage: percentage || 0, timeTaken: timeTaken || 0, xp: xp || 0 });
    return res.status(201).json({ message: "Score submitted", data: doc });
  } catch (error) { next(error); }
};
module.exports = submitV1;
