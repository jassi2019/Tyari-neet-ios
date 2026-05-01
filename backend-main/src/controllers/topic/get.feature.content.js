const Topic = require("../../models/topic");
const { FEATURE_TYPE_TO_FIELD } = require("../../constants");

/**
 * GET /api/v1/topics/:topicId/feature/:featureType
 * Returns the content URL for the requested feature on a topic.
 * Falls back to legacy contentURL/contentId/contentThumbnail when the
 * per-feature slot is empty.
 */
const getFeatureContentV1 = async (req, res, next) => {
  try {
    const { topicId, featureType } = req.params;

    const field = FEATURE_TYPE_TO_FIELD[featureType];
    if (!field) {
      return res.status(400).json({
        message: `Invalid featureType. Allowed: ${Object.keys(FEATURE_TYPE_TO_FIELD).join(", ")}`,
      });
    }

    const topic = await Topic.findByPk(topicId);
    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const slotValue = topic[field];
    const slotURL = typeof slotValue === "string" ? slotValue.trim() : "";

    const url = slotURL || topic.contentURL || null;

    return res.status(200).json({
      data: {
        topicId: topic.id,
        topicName: topic.name,
        featureType,
        url,
        thumbnail: topic.contentThumbnail || null,
        contentId: topic.contentId || null,
        description: topic.description || "",
        serviceType: topic.serviceType,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFeatureContentV1;
