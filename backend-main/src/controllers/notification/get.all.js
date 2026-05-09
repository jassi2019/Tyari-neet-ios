const { Notification } = require("../../models");

const getAllV1 = async (req, res, next) => {
  try {
    const docs = await Notification.findAll({ order: [["createdAt", "DESC"]] });
    return res.status(200).json({ message: "All notifications", data: docs });
  } catch (error) { next(error); }
};
module.exports = getAllV1;
