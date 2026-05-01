const Topic = require("../../models/topic");
const { FEATURE_TYPE_TO_FIELD } = require("../../constants");

/**
 * GET /api/v1/topics/:topicId/feature/:featureType
 * Returns the content slot for the requested feature on a topic.
 * Falls back to legacy contentURL/contentId/contentThumbnail if the per-feature
 * slot has not been populated yet.
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

    const slot = topic[field];
    const hasSlotData =
      slot && typeof slot === "object" && (slot.url || slot.contentId);

    const content = hasSlotData
      ? {
          url: slot.url || null,
          thumbnail: slot.thumbnail || topic.contentThumbnail || null,
          contentId: slot.contentId || null,
          description: slot.description || topic.description || "",
        }
      : {
          // Backward-compatible fallback to legacy fields
          url: topic.contentURL || null,
          thumbnail: topic.contentThumbnail || null,
          contentId: topic.contentId || null,
          description: topic.description || "",
        };

    return res.status(200).json({
      data: {
        topicId: topic.id,
        topicName: topic.name,
        featureType,
        ...content,
        serviceType: topic.serviceType,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = getFeatureContentV1;
