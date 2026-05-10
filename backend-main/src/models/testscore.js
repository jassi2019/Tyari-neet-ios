const { DataTypes } = require("sequelize");
const db = require("../config/db");

const TestScore = db.define("TestScore", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, references: { model: "users", key: "id" } },
  subjectId: { type: DataTypes.UUID, allowNull: true, references: { model: "subjects", key: "id" } },
  chapterId: { type: DataTypes.UUID, allowNull: true, references: { model: "chapters", key: "id" } },
  classId: { type: DataTypes.UUID, allowNull: true, references: { model: "classes", key: "id" } },
  testType: { type: DataTypes.STRING, allowNull: false, defaultValue: "daily" },
  questionType: { type: DataTypes.STRING, allowNull: false, defaultValue: "MCQ" },
  totalQuestions: { type: DataTypes.INTEGER, allowNull: false },
  correctAnswers: { type: DataTypes.INTEGER, allowNull: false },
  wrongAnswers: { type: DataTypes.INTEGER, allowNull: false },
  skipped: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  score: { type: DataTypes.FLOAT, allowNull: false },
  percentage: { type: DataTypes.FLOAT, allowNull: false },
  timeTaken: { type: DataTypes.INTEGER, allowNull: true },
  xp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { timestamps: true, tableName: "test_scores" });

TestScore.associate = (models) => {
  TestScore.belongsTo(models.User, { foreignKey: "userId", onDelete: "CASCADE" });
  TestScore.belongsTo(models.Subject, { foreignKey: "subjectId" });
  TestScore.belongsTo(models.Chapter, { foreignKey: "chapterId" });
  TestScore.belongsTo(models.Class, { foreignKey: "classId" });
};

module.exports = TestScore;
