const mongoose = require("mongoose");
const Order = require("../../models/Order");

const payment = async (req, res) => {
  try {
    const { userId, name, phone, address, items } = req.body;

    if (!userId || !name || !phone || !address || !items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không đầy đủ" });
    }

    // Convert userId & productId sang ObjectId
    const formattedItems = items.map((i) => ({
      productId: mongoose.Types.ObjectId(i.productId),
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    }));

    const order = await Order.create({
      userId: mongoose.Types.ObjectId(userId),
      name,
      phone,
      address,
      items: formattedItems,
    });

    return res.json({ success: true, orderId: order._id });
  } catch (error) {
    console.error("Lỗi khi lưu đơn hàng:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

module.exports = payment;
