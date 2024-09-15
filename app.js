const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { join } = require("path");
const mongoose = require("./db");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(join(__dirname, "public")));

const MessageSchema = new mongoose.Schema({
  sender_id: String,
  receiver_id: String,
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  reply: { type: String, default: null },
  image: { type: String, default: null },
  file: { type: String, default: null },
  customId: String,
  editedMessage: { type: String, default: null },
});

const Message = mongoose.model("Message", MessageSchema);

const users = {};

io.on("connection", (socket) => {
  socket.on("new-user-joined", (userName) => {
    users[socket.id] = { id: socket.id, name: userName };
    socket.emit("assign-user-id", socket.id);
    io.emit("user-list", Object.values(users));
    io.emit("user-joined", userName);
    console.log("User connected");
    
  });

  socket.on("send-message", async (data) => {
    try {
      const customId = `${data.user}: ${data.text}`;
      const message = new Message({
        sender_id: socket.id,
        receiver_id: data.receiverId,
        message: data.text,
        reply: data.reply,
        user: data.user,
        customId: customId,
      });
      await message.save();
      console.log("saved mesasge :", message);

      socket.to(data.receiverId).emit("chat message", {
        user: data.user,
        message: data.text,
        sender_id: socket.id,
        reply: data.reply,
        _id: Message._id,
      });

      socket.emit("chat message", {
        user: data.user,
        message: data.text,
        sender_id: socket.id,
        reply: data.reply,
        _id: Message._id,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message." });
    }
  });

  socket.on("edit-message", async (data) => {
    const { messageId, editedMessage } = data;

    console.log("Message ID:", messageId);
    console.log("Edited message:", editedMessage);

    try {
      // Find the message using the custom identifier
      const existingMessage = await Message.findOne({ customId: messageId });
      console.log("Existing message:", existingMessage);

      if (!existingMessage) {
        console.error("Message not found for custom ID:", messageId);
        return;
      }

      // Update the existing message's editedMessage field
      existingMessage.editedMessage =
        editedMessage || existingMessage.editedMessage;
      await existingMessage.save();

      console.log("Updated message:", existingMessage);

      // Emit the updated message to both sender and receiver
      io.emit("message-edited", {
        messageId: existingMessage.customId,
        editedMessage: existingMessage.editedMessage,
        sender_id: existingMessage.sender_id,
        receiver_id: existingMessage.receiver_id,
        timestamp: existingMessage.timestamp,
      });
    } catch (err) {
      console.error("Error updating message:", err);
    }
  });

  socket.on("send-image", async (data) => {
    try {
      const message = new Message({
        sender_id: socket.id,
        receiver_id: data.receiverId,
        image: data.image,
        reply: data.reply || null,
        user: data.user,
      });

      await message.save();

      socket.to(data.receiverId).emit("receive-image", {
        image: data.image,
        sender_id: socket.id,
        user: data.user,
        reply: data.reply,
      });
    } catch (error) {
      console.error("Error sending image:", error);
      socket.emit("error", { message: "Failed to send image." });
    }
  });

  socket.on("send-file", async (data) => {
    try {
      const { file, receiverId, user } = data;

      const message = new Message({
        sender_id: socket.id,
        receiver_id: receiverId,
        file: file, // Save the file data (base64 encoded)
        user: user,
      });

      await message.save();
      console.log("send file message :", message);

      // Emit the file data to the receiver
      socket.to(receiverId).emit("receive-file", {
        file: file,
        sender_id: socket.id,
        user: user,
      });
    } catch (error) {
      console.error("Error sending file:", error);
      socket.emit("error", { message: "Failed to send file." });
    }
  });

  socket.on("backup-messages", async (userId) => {
    try {
      const messages = await Message.find({
        $or: [{ sender_id: userId }, { receiver_id: userId }],
      }).sort({ timestamp: 1 });

      socket.emit("load-messages", messages);
    } catch (error) {
      console.error("Error backing up messages:", error);
    }
  });

  socket.on("disconnect", () => {
    if (users[socket.id]) {
      const userName = users[socket.id].name;
      delete users[socket.id];
      io.emit("left", userName);
      io.emit("user-list", Object.values(users));
      console.log("User disconnected");
    }
  });

  socket.on("request-user-list", () => {
    io.emit("user-list", Object.values(users));
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
