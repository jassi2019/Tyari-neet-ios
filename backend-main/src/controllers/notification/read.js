const { NotificationRead } = require("../../models");

const markReadV1 = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    const existing = await NotificationRead.findOne({ where: { notificationId, userId } });
    if (!existing) await NotificationRead.create({ notificationId, userId });
    return res.status(200).json({ message: "Marked as read" });
  } catch (error) { next(error); }
};
module.exports = markReadV1;
