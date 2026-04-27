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

    const doc = await Topic.update(
      {
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
      },
      { where: { id: topicId } }
    );

    return res
      .status(200)
      .json({ message: "Topic updated successfully", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = updateV1;
