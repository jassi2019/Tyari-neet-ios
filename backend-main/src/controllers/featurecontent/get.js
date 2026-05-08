const { FeatureContent, Chapter, Subject, Class } = require("../../models");

const getV1 = async (req, res, next) => {
  try {
    const { featureType, subjectId, classId, chapterId } = req.query;
    const where = {};
    if (featureType) where.featureType = featureType;
    if (subjectId) where.subjectId = subjectId;
    if (classId) where.classId = classId;
    if (chapterId) where.chapterId = chapterId;

    const docs = await FeatureContent.findAll({
      where,
      order: [["sequence", "ASC"], ["createdAt", "DESC"]],
      include: [
        { model: Chapter, attributes: ["id", "name", "number"] },
        { model: Subject, attributes: ["id", "name"] },
        { model: Class, attributes: ["id", "name"] },
      ],
    });
    return res.status(200).json({ message: "Feature contents fetched", data: docs });
  } catch (error) { next(error); }
};
module.exports = getV1;
