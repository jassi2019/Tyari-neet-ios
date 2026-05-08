const { FeatureContent } = require("../../models");

const updateV1 = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await FeatureContent.findByPk(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    await doc.update(req.body);
    return res.status(200).json({ message: "Updated", data: doc });
  } catch (error) { next(error); }
};
module.exports = updateV1;
