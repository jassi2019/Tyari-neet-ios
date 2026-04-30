const HomeContent = require("../../models/homecontent");

const createV1 = async (req, res, next) => {
  try {
    const { section, icon, title, description, bgColor, btnColor, imageUrl, sortOrder, isActive } = req.body;

    if (!section || !title) {
      return res.status(400).json({ message: "section and title are required" });
    }

    const doc = await HomeContent.create({
      section,
      icon: icon || null,
      title,
      description: description || null,
      bgColor: bgColor || null,
      btnColor: btnColor || null,
      imageUrl: imageUrl || null,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
    });

    return res.status(201).json({ message: "Home content created", data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = createV1;
