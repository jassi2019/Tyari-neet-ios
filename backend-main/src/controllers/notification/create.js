const { Notification } = require("../../models");

const createV1 = async (req, res, next) => {
  try {
    const { title, message, icon, targetScreen, targetId, isGlobal, userId } = req.body;
    if (!title || !message) return res.status(400).json({ message: "title and message required" });
    const doc = await Notification.create({ title, message, icon: icon || "bell", targetScreen, targetId, isGlobal: isGlobal !== false, userId: userId || null });
    return res.status(201).json({ message: "Notification sent", data: doc });
  } catch (error) { next(error); }
};
module.exports = createV1;
