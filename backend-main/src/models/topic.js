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
    // Legacy main content — now optional, since 7 per-feature slots can replace it.
    contentURL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contentThumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Per-feature content slots — each stores a content URL string.
    // Falls back to legacy contentURL when null.
    explanationContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    revisionContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hiddenLinksContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    exerciseRevivalContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    masterExemplarContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pyqContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    chapterCheckpointContent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
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
