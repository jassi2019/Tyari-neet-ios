const { Topic } = require("../../models");
const { getDesign, getDesignViewUrl } = require("../../services/canva");

const createV1 = async (req, res, next) => {
  try {
    const {
      name,
      description,
      contentId,
      contentURL,
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

    const {
      design,
    } = await getDesign(contentId);
    const contentThumbnail = design?.thumbnail?.url || null;
    const resolvedContentURL = getDesignViewUrl(design) || contentURL;

    const doc = await Topic.create({
      name,
      description,
      contentURL: resolvedContentURL,
      contentThumbnail,
      contentId,
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
