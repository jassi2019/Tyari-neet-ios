const HomeContent = require("../../models/homecontent");

const getAllV1 = async (req, res, next) => {
  try {
    const { section } = req.query;
    const where = {};
    if (section) where.section = section;

    const docs = await HomeContent.findAll({
      where,
      order: [["section", "ASC"], ["sortOrder", "ASC"], ["createdAt", "ASC"]],
    });

    return res.status(200).json({ data: docs });
  } catch (error) {
    next(error);
  }
};

module.exports = getAllV1;
