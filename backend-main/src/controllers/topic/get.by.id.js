const { Topic } = require("../../models");
const { FEATURE_TYPE_TO_FIELD } = require("../../constants");

const ALL_CONTENT_FIELDS = Object.values(FEATURE_TYPE_TO_FIELD);

const getByIdV1 = async (req, res, next) => {
  try {
    const { topicId } = req.params;
    const { featureType } = req.query;

    const doc = await Topic.findByPk(topicId);

    if (!doc) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const plain = doc.toJSON();

    // Always null out all 7 content fields by default.
    // Only return content for the requested featureType.
    // This prevents the app from showing wrong/all content.
    if (featureType && FEATURE_TYPE_TO_FIELD[featureType]) {
      const keepField = FEATURE_TYPE_TO_FIELD[featureType];
      for (const field of ALL_CONTENT_FIELDS) {
        if (field !== keepField) {
          plain[field] = null;
        }
      }
    } else {
      // No featureType specified — null out ALL content fields + legacy URL
      for (const field of ALL_CONTENT_FIELDS) {
        plain[field] = null;
      }
      plain.contentURL = null;
      plain.contentThumbnail = null;
      plain.contentId = null;
    }

    return res
      .status(200)
      .json({ message: "Topic fetched successfully", data: plain });
  } catch (error) {
    next(error);
  }
};

module.exports = getByIdV1;
