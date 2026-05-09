const { DataTypes } = require("sequelize");
const db = require("../config/db");

const NotificationRead = db.define(
  "NotificationRead",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    notificationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "notifications", key: "id" },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
  },
  {
    timestamps: true,
    tableName: "notification_reads",
  }
);

module.exports = NotificationRead;
