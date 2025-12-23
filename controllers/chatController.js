const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Task = require("../models/task");
const { decryptText, encryptText } = require("../utils/chatEncryption");
const { deleteFile } = require("../utils/cloudinaryService");
const User = require("../models/user");

// Helper: check if user is a participant
async function getAuthorizedConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId)
    .populate("task", "status uploadedBy assignedTo")
    .lean();

  if (!conversation) return { error: "Conversation not found." };

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId
  );
  if (!isParticipant) return { error: "You are not a participant in this conversation." };

  // Optionally enforce task status (only in-progress / completed)
  if (!conversation.task) {
    return { error: "Associated task not found." };
  }

  if (!["in progress", "completed"].includes(conversation.task.status)) {
    return { error: "Chat is only available when the task is in progress or completed." };
  }

  return { conversation };
}

// GET /api/chat/conversations?updatedSince=2025-12-09T10:00:00.000Z
async function getMyConversations(req, res) {
  try {
    const userId = req.user.id;
    const { updatedSince } = req.query;

    const query = {
      participants: userId,
      status: "active",
    };

    // Polling support
    if (updatedSince) {
      const sinceDate = new Date(updatedSince);
      if (!isNaN(sinceDate.getTime())) {
        query.$or = [
          { lastMessageAt: { $gt: sinceDate } },
          { updatedAt: { $gt: sinceDate } },
        ];
      }
    }

    const conversations = await Conversation.find(query)
      .populate("task", "title status")
      .populate("application", "status")
      .populate("participants", "name image") // 👈 only needed fields
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId
      );

      return {
        _id: conv._id,
        task: conv.task,
        application: conv.application,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,

        // 👇 exactly what you asked for
        otherUser: otherUser
          ? {
              _id: otherUser._id,
              name: otherUser.name,
              image: otherUser.image,
            }
          : null,
      };
    });

    res.status(200).json({
      message: "Conversations fetched successfully.",
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

// GET /api/chat/conversations/:id/messages?limit=&before=&after=
async function getConversationMessages(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { limit = 30, before, after } = req.query;

    const { conversation, error } = await getAuthorizedConversation(
      conversationId,
      userId
    );
    if (error) {
      return res.status(403).json({ message: error });
    }

    /**
     * STEP 1: Find the OTHER participant (recipient)
     * conversation.participants contains both users
     */
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== userId
    );

    /**
     * STEP 2: Fetch minimal recipient details
     */
    const recipient = await User.findById(recipientId)
      .select("name image")
      .lean();

    const messageQuery = {
      conversation: conversationId,
      deletedFor: { $ne: userId },
    };

    // Build date filter
    const dateFilter = {};

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        dateFilter.$lt = beforeDate;
      }
    }

    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        dateFilter.$gt = afterDate;
      }
    }

    if (Object.keys(dateFilter).length > 0) {
      messageQuery.createdAt = dateFilter;
    }

    const messages = await Message.find(messageQuery)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const transformedMessages = messages
      .map((m) => ({
        ...m,
        text: m.encryptedText ? decryptText(m.encryptedText) : null,
        encryptedText: undefined,
      }))
      .reverse(); // oldest first

    res.status(200).json({
      message: "Messages fetched successfully.",
      recipient: recipient
        ? {
            _id: recipient._id,
            name: recipient.name,
            image: recipient.image,
          }
        : null,
      messages: transformedMessages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// POST /api/chat/conversations/:id/messages  (multipart/form-data)
async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;
    const { text } = req.body;

    const { conversation, error } = await getAuthorizedConversation(
      conversationId,
      userId
    );
    if (error) {
      return res.status(403).json({ message: error });
    }

    const attachments = req.chatAttachments || [];

    if (!text && attachments.length === 0) {
      return res.status(400).json({
        message: "Message must contain text or at least one attachment.",
      });
    }

    const encryptedText = text ? encryptText(text) : null;

    const message = new Message({
      conversation: conversationId,
      sender: userId,
      encryptedText,
      attachments,
      isRead: false,
    });

    await message.save();

    // Update lastMessageAt for conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageAt: new Date(),
    });

    const responseMessage = {
      ...message.toObject(),
      text: encryptedText ? text : null, // send plaintext to the sender
      encryptedText: undefined,
    };

    res.status(201).json({
      message: "Message sent successfully.",
      data: responseMessage,
    });

    // NOTE: Here is where you'd emit a Socket.io event, e.g.:
    // io.to("conversation:" + conversationId).emit("newMessage", responseMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

// PATCH /api/chat/conversations/:id/read
async function markConversationRead(req, res) {
  try {
    const userId = req.user.id;
    const { id: conversationId } = req.params;

    const { conversation, error } = await getAuthorizedConversation(
      conversationId,
      userId
    );
    if (error) {
      return res.status(403).json({ message: error });
    }

    // Mark all unread messages (from the other user) as read
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      {
        $set: { isRead: true, readAt: new Date() },
      }
    );

    res.status(200).json({
      message: "Conversation marked as read.",
    });

    // Socket.io broadcast could go here
    // io.to("conversation:" + conversationId).emit("messagesRead", { userId, conversationId });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// DELETE /api/chat/messages/:messageId
async function deleteMessage(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "You are not allowed to delete this message." });
    }

    // "Delete for me" behaviour:
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
    }

    await message.save();

    res.status(200).json({
      message: "Message deleted successfully (for this user).",
    });

    // Socket.io broadcast could notify others
    // io.to("conversation:" + message.conversation.toString()).emit("messageDeleted", { messageId, userId });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

// DELETE /api/chat/messages/:messageId/for-everyone
async function deleteMessageForEveryone(req, res) {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Only sender can delete for everyone
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        message: "You are not allowed to delete this message for everyone.",
      });
    }

    // Delete attachments from Cloudinary (if any)
    if (message.attachments && message.attachments.length > 0) {
      for (const att of message.attachments) {
        try {
          await deleteFile(att.publicId, att.resourceType || "raw");
        } catch (err) {
          console.error(
            `Failed to delete attachment ${att.publicId} from Cloudinary:`,
            err.message
          );
          // Do NOT return error here — continue best-effort deletion
        }
      }
    }

    // Finally, remove message from DB
    await Message.findByIdAndDelete(messageId);

    return res.status(200).json({
      message: "Message deleted for everyone successfully.",
      messageId,
    });

    // OPTIONAL Socket.io event (for later)
    // io.to("conversation:" + message.conversation.toString())
    //   .emit("messageDeletedForEveryone", { messageId });

  } catch (error) {
    console.error("Error deleting message for everyone:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the message.",
      error: error.message,
    });
  }
}

module.exports = {
  getMyConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
  deleteMessageForEveryone
};
