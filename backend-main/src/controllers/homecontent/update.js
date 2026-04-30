const HomeContent = require("../../models/homecontent");

const updateV1 = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await HomeContent.findByPk(id);
    if (!doc) return res.status(404).json({ message: "Not found" });

    const { section, icon, title, description, bgColor, btnColor, imageUrl, sortOrder, isActive } = req.body;

    await doc.update({
      ...(section !== undefined && { section }),
      ...(icon !== undefined && { icon }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(bgColor !== undefined && { bgColor }),
      ...(btnColor !== undefined && { btnColor }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    });

    return res.status(200).json({ message: "Updated", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = updateV1;
