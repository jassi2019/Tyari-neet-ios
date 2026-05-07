const { Topic } = require("../../models");

const createV1 = async (req, res, next) => {
  try {
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

    const doc = await Topic.create({
      name,
      description,
      contentURL: contentURL || "",
      contentThumbnail: contentThumbnail || null,
      contentId: null,
      sequence,
      serviceType,
      chapterId,
      subjectId,
      classId,
      explanationContent: explanationContent || null,
      revisionContent: revisionContent || null,
      hiddenLinksContent: hiddenLinksContent || null,
      exerciseRevivalContent: exerciseRevivalContent || null,
      masterExemplarContent: masterExemplarContent || null,
      pyqContent: pyqContent || null,
      chapterCheckpointContent: chapterCheckpointContent || null,
    });

    return res
      .status(201)
      .json({ message: "Topic created successfully", data: doc });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

module.exports = createV1;
