const { DataTypes } = require("sequelize");
const db = require("../config/db");

const Notification = db.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "bell",
    },
    targetScreen: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isGlobal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
    },
  },
  {
    timestamps: true,
    tableName: "notifications",
  }
);

Notification.associate = (models) => {
  Notification.belongsTo(models.User, { foreignKey: "userId", onDelete: "CASCADE" });
};

module.exports = Notification;
