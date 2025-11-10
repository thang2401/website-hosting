const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  name: String,
  phone: String,
  address: String,
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  status: {
    type: String,
    enum: ["đang chờ xử lý", "đã xác nhận", "đang vận chuyển", "đã giao hàng"],
    default: "đang chờ xử lý",
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
