const { Topic } = require("../../models");

const updateV1 = async (req, res, next) => {
  try {
    const { topicId } = req.params;

    const {
      name,
      description,
      contentURL,
      contentThumbnail,
      sequence,
      serviceType,
      chapterId,
      subjectId,
      classId,
      explanationContent,
      revisionContent,
      hiddenLinksContent,
      exerciseRevivalContent,
      masterExemplarContent,
      pyqContent,
      chapterCheckpointContent,
    } = req.body;

    const updatePayload = {
      name,
      description,
      contentURL,
      contentThumbnail,
      sequence,
      serviceType,
      chapterId,
      subjectId,
      classId,
    };

    const featureFields = {
      explanationContent,
      revisionContent,
      hiddenLinksContent,
      exerciseRevivalContent,
      masterExemplarContent,
      pyqContent,
      chapterCheckpointContent,
    };
    for (const [key, value] of Object.entries(featureFields)) {
      if (value !== undefined) updatePayload[key] = value;
    }

    const doc = await Topic.update(updatePayload, { where: { id: topicId } });

    return res
      .status(200)
      .json({ message: "Topic updated successfully", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = updateV1;
