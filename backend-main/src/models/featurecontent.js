const { DataTypes } = require("sequelize");
const db = require("../config/db");
const { SERVICE_TYPES, FEATURE_TYPES } = require("../constants");

const FeatureContent = db.define(
  "FeatureContent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contentURL: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    featureType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serviceType: {
      type: DataTypes.ENUM(SERVICE_TYPES.PREMIUM, SERVICE_TYPES.FREE),
      allowNull: false,
      defaultValue: SERVICE_TYPES.FREE,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: "feature_contents",
  }
);

FeatureContent.associate = (models) => {
  FeatureContent.belongsTo(models.Chapter, { foreignKey: "chapterId", onDelete: "CASCADE" });
  FeatureContent.belongsTo(models.Subject, { foreignKey: "subjectId", onDelete: "CASCADE" });
  FeatureContent.belongsTo(models.Class, { foreignKey: "classId", onDelete: "CASCADE" });
};

module.exports = FeatureContent;
