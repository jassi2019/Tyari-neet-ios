const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Question = db.define(
  "Question",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    optionA: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    optionB: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    optionC: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    optionD: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    correctOption: {
      type: DataTypes.ENUM("A", "B", "C", "D"),
      allowNull: false,
    },
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM("EASY", "MEDIUM", "HARD"),
      allowNull: false,
      defaultValue: "MEDIUM",
    },
    marks: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "+4 / −1",
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    chapterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "chapters", key: "id" },
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "subjects", key: "id" },
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "classes", key: "id" },
    },
  },
  {
    timestamps: true,
    tableName: "questions",
  }
);

Question.associate = (models) => {
  Question.belongsTo(models.Chapter, {
    foreignKey: "chapterId",
    onDelete: "CASCADE",
  });
  Question.belongsTo(models.Subject, {
    foreignKey: "subjectId",
    onDelete: "CASCADE",
  });
  Question.belongsTo(models.Class, {
    foreignKey: "classId",
    onDelete: "CASCADE",
  });
};

module.exports = Question;
