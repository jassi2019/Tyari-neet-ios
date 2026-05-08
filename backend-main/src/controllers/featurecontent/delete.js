const { FeatureContent } = require("../../models");

const deleteV1 = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await FeatureContent.findByPk(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    await doc.destroy();
    return res.status(200).json({ message: "Deleted" });
  } catch (error) { next(error); }
};
module.exports = deleteV1;
