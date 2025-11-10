const Order = require("../../models/Order");

const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate("items.productId") // <== CHỈ CẦN DÒNG NÀY
      .sort({ createdAt: -1 }); // sắp xếp theo thời gian mới nhất
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("Lỗi lấy đơn hàng:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = getUserOrders;
