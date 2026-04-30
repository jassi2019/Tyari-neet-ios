const HomeContent = require("../../models/homecontent");

const getV1 = async (req, res, next) => {
  try {
    const { section } = req.query;
    const where = { isActive: true };
    if (section) where.section = section;

    const docs = await HomeContent.findAll({
      where,
      order: [["sortOrder", "ASC"], ["createdAt", "ASC"]],
    });

    return res.status(200).json({ data: docs });
  } catch (error) {
    next(error);
  }
};

module.exports = getV1;
