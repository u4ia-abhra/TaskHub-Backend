const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadFile(buffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const isImage = mimeType && mimeType.startsWith("image/");
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: isImage ? "image" : "raw", // supports images, pdf, docs, etc.
        public_id: undefined, // let cloudinary generate
        folder: "taskhub/tasks", // optional: set your folder structure
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

function deleteFile(publicId, resourceType = (mimeType && mimeType.startsWith("image/")) ? "image" : "raw") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
}

module.exports = {
  uploadFile,
  deleteFile,
};
