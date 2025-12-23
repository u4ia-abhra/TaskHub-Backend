const { uploadFile } = require("../utils/cloudinaryService");
const { MAX_CHAT_FILES } = require("./chatUploadMiddleware");

async function processChatAttachments(req, res, next) {
  try {
    const files = req.files || [];

    if (files.length > MAX_CHAT_FILES) {
      return res.status(400).json({
        message: `You can upload a maximum of ${MAX_CHAT_FILES} attachments per message.`,
      });
    }

    if (files.length === 0) {
      req.chatAttachments = [];
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

    req.chatAttachments = attachments;
    next();
  } catch (error) {
    console.error("Error processing chat attachments:", error);
    return res.status(500).json({
      message: "Failed to upload chat attachments.",
      error: error.message,
    });
  }
}

module.exports = {
  processChatAttachments,
};
