const { User } = require("../../models");

const adminUpdateUserV1 = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, email, bio, phone, role } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;

    await user.update(updateData);

    const updated = await User.findByPk(userId, { attributes: { exclude: ["password"] } });
    return res.status(200).json({ message: "User updated successfully", data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = adminUpdateUserV1;
