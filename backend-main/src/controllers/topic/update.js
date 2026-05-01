const { Topic } = require("../../models");
const { getDesign, getDesignViewUrl } = require("../../services/canva");

const updateV1 = async (req, res, next) => {
  try {
    const { topicId } = req.params;

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
      revisionRecallContent,
      hiddenLinksContent,
      exerciseRevivalContent,
      masterExemplarContent,
      pyqContent,
      chapterCheckpointContent,
    } = req.body;

    let contentThumbnail = undefined;
    let resolvedContentURL = contentURL;

    if (contentId) {
      const {
        design,
      } = await getDesign(contentId);

      if (typeof design?.thumbnail?.url === "string" && design.thumbnail.url.trim()) {
        contentThumbnail = design.thumbnail.url.trim();
      }
      resolvedContentURL = getDesignViewUrl(design) || contentURL;
    }

    // Build update payload only with defined fields, so unrelated slots are not overwritten.
    const updatePayload = {
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
    };
    const featureFields = {
      explanationContent,
      revisionRecallContent,
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
