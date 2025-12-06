const { uploadFile } = require("../utils/cloudinaryService");
const { MAX_FILES } = require("./uploadMiddleware");

async function processTaskAttachments(req, res, next) {
  try {
    const files = req.files || [];

    // Extra safety (multer already caps it)
    if (files.length > MAX_FILES) {
      return res.status(400).json({
        message: `You can upload a maximum of ${MAX_FILES} attachments per task.`,
      });
    }

    if (files.length === 0) {
      req.attachments = [];
      return next();
    }

    const attachments = [];

    for (const file of files) {
      const uploadResult = await uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      attachments.push({
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        resourceType: uploadResult.resourceType,
      });
    }

    req.attachments = attachments;
    next();
  } catch (error) {
    console.error("Error processing attachments:", error);
    return res.status(500).json({
      message: "Failed to upload attachments.",
      error: error.message,
    });
  }
}

module.exports = {
  processTaskAttachments,
};
