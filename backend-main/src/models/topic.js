const { DataTypes } = require("sequelize");

const db = require("../config/db");
const { SERVICE_TYPES } = require("../constants");

const Topic = db.define(
  "Topic",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentURL: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentThumbnail: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    contentId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Per-feature content slots. Each is a JSON object: { url, thumbnail, contentId, description }.
    // Falls back to legacy contentURL/contentId/contentThumbnail when null.
    explanationContent: { type: DataTypes.JSONB, allowNull: true },
    revisionRecallContent: { type: DataTypes.JSONB, allowNull: true },
    hiddenLinksContent: { type: DataTypes.JSONB, allowNull: true },
    exerciseRevivalContent: { type: DataTypes.JSONB, allowNull: true },
    masterExemplarContent: { type: DataTypes.JSONB, allowNull: true },
    pyqContent: { type: DataTypes.JSONB, allowNull: true },
    chapterCheckpointContent: { type: DataTypes.JSONB, allowNull: true },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.ENUM(SERVICE_TYPES.PREMIUM, SERVICE_TYPES.FREE),
      allowNull: false,
      defaultValue: SERVICE_TYPES.PREMIUM,
    },
    chapterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "chapters",
        key: "id",
      },
    },
    subjectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "classes",
        key: "id",
      },
    },
  },
  {
    timestamps: true,
    tableName: "topics",
  }
);

Topic.associate = (models) => {
  Topic.belongsTo(models.Chapter, {
    foreignKey: "chapterId",
    onDelete: "CASCADE",
  });

  Topic.belongsTo(models.Subject, {
    foreignKey: "subjectId",
    onDelete: "CASCADE",
  });

  Topic.belongsTo(models.Class, {
    foreignKey: "classId",
    onDelete: "CASCADE",
  });

  Topic.hasMany(models.Favorite, {
    foreignKey: "topicId",
    onDelete: "CASCADE",
  });

  Topic.hasMany(models.LastRead, {
    foreignKey: "topicId",
    onDelete: "CASCADE",
  });
};

module.exports = Topic;
