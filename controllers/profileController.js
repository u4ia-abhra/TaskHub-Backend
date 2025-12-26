const User = require("../models/user");
const {
  uploadProfileImage,
  deleteProfileImage,
} = require("../utils/profileImageUpload");

async function updateProfileImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete old image if exists
    if (user.imagePublicId) {
      await deleteProfileImage(user.imagePublicId);
    }

    // Upload new image
    const result = await uploadProfileImage(req.file.buffer);

    user.image = result.secure_url;
    user.imagePublicId = result.public_id;

    await user.save();

    res.status(200).json({
      message: "Profile image updated successfully.",
      image: user.image,
    });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({
      message: "Failed to upload profile image.",
      error: error.message,
    });
  }
}

async function removeProfileImage(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.imagePublicId) {
      await deleteProfileImage(user.imagePublicId);
    }

    user.image = undefined;
    user.imagePublicId = undefined;
    await user.save();

    res.status(200).json({
      message: "Profile image removed successfully.",
    });
  } catch (error) {
    console.error("Remove profile image error:", error);
    res.status(500).json({
      message: "Failed to remove profile image.",
      error: error.message,
    });
  }
}

module.exports = {
  updateProfileImage,
  removeProfileImage,
};