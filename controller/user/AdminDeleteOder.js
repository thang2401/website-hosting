const Order = require("../../models/Order"); // model Order

// Xóa đơn hàng theo _id
const deleteOrderController = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem đơn hàng có tồn tại không
    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng!" });
    }

    await Order.findByIdAndDelete(id);

    res.json({ success: true, message: "Đã xóa đơn hàng thành công!" });
  } catch (err) {
    console.error("❌ Lỗi xóa đơn hàng:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xóa đơn hàng!" });
  }
};

module.exports = deleteOrderController;
