const { uploadFile, deleteFile } = require("../utils/cloudinaryService");

async function uploadProfileImage(buffer, originalname, mimetype) {
  const result = await uploadFile(buffer, originalname, mimetype);

  return {
    secure_url: result.url,
    public_id: result.publicId,
  };
}

async function deleteProfileImage(publicId) {
  if (!publicId) return;
  await deleteFile(publicId, "image");
}

module.exports = { uploadProfileImage, deleteProfileImage };