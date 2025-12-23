const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
  deleteMessageForEveryone
} = require("../controllers/chatController");

const {
  uploadChatAttachments,
} = require("../middleware/chatUploadMiddleware");
const {
  processChatAttachments,
} = require("../middleware/chatAttachmentsProcessing");

// List all conversations for current user
router.get("/conversations", authMiddleware, getMyConversations);

// Get messages in a conversation
router.get(
  "/conversations/:id/messages",
  authMiddleware,
  getConversationMessages
);

// Send a message (with optional attachments)
router.post(
  "/conversations/:id/messages",
  authMiddleware,
  uploadChatAttachments,
  processChatAttachments,
  sendMessage
);

// Mark conversation as read
router.patch(
  "/conversations/:id/read",
  authMiddleware,
  markConversationRead
);

// Delete for me
router.delete("/messages/:messageId", authMiddleware, deleteMessage);

// Delete for everyone
router.delete(
  "/messages/:messageId/for-everyone",
  authMiddleware,
  deleteMessageForEveryone
);

module.exports = router;