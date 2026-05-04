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

    // If featureType is specified, only return that feature's content.
    // Null out all other content fields so app doesn't show wrong content.
    if (featureType && FEATURE_TYPE_TO_FIELD[featureType]) {
      const keepField = FEATURE_TYPE_TO_FIELD[featureType];
      for (const field of ALL_CONTENT_FIELDS) {
        if (field !== keepField) {
          plain[field] = null;
        }
      }
      // Also null out legacy contentURL so it doesn't fallback
      if (plain[keepField]) {
        plain.contentURL = null;
      }
    }

    return res
      .status(200)
      .json({ message: "Topic fetched successfully", data: plain });
  } catch (error) {
    next(error);
  }
};

module.exports = getByIdV1;
