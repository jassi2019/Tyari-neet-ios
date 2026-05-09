const { Notification, NotificationRead } = require("../../models");
const { Op } = require("sequelize");

const getV1 = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.findAll({
      where: { [Op.or]: [{ isGlobal: true }, { userId }] },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    const readIds = await NotificationRead.findAll({ where: { userId }, attributes: ["notificationId"] });
    const readSet = new Set(readIds.map(r => r.notificationId));
    const result = notifications.map(n => ({ ...n.toJSON(), isRead: readSet.has(n.id) }));
    const unreadCount = result.filter(r => !r.isRead).length;
    return res.status(200).json({ message: "Notifications fetched", data: { notifications: result, unreadCount } });
  } catch (error) { next(error); }
};
module.exports = getV1;
