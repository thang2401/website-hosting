const Order = require("../../models/Order");

const deleteOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Đơn hàng không tồn tại" });
    }

    await order.remove();
    res.json({ success: true, message: "Đơn hàng đã được xóa" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi khi xóa đơn hàng" });
  }
};

module.exports = deleteOrder;
