const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  sender_id: { type: String, required: true },
  receiver_id: { type: String, required: true },
  message: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  reply: { type: String, default: null }, //true
  image: { type: String, default: null },
  file:{type: String, default: null},
  editedMessage: { type: String, default: null },
  customId: { type: String, required: false },
});
//MessageSchema.index({ customId: 1 });

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
