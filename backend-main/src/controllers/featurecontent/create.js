const { FeatureContent } = require("../../models");

const createV1 = async (req, res, next) => {
  try {
    const { title, description, contentURL, featureType, serviceType, sequence, isActive, chapterId, subjectId, classId } = req.body;
    if (!title || !featureType || !chapterId || !subjectId || !classId) {
      return res.status(400).json({ message: "title, featureType, chapterId, subjectId, classId are required" });
    }
    const doc = await FeatureContent.create({ title, description, contentURL, featureType, serviceType, sequence, isActive, chapterId, subjectId, classId });
    return res.status(201).json({ message: "Feature content created", data: doc });
  } catch (error) { next(error); }
};
module.exports = createV1;
