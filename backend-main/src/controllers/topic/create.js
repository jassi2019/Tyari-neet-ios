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

    // Canva lookup is optional — only attempt when a contentId was actually provided.
    let contentThumbnail = null;
    let resolvedContentURL = contentURL || "";
    if (contentId && String(contentId).trim()) {
      try {
        const { design } = await getDesign(contentId);
        contentThumbnail = design?.thumbnail?.url || null;
        resolvedContentURL = getDesignViewUrl(design) || contentURL || "";
      } catch (err) {
        // Canva fetch failed — proceed with raw values, do not block topic creation.
        console.warn("Canva getDesign failed, continuing without thumbnail:", err.message);
      }
    }

    const doc = await Topic.create({
      name,
      description,
      contentURL: resolvedContentURL,
      contentThumbnail,
      contentId: contentId || null,
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
