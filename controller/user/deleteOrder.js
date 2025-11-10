const Order = require("../../models/Order");

const deleteOrder = async (req, res) => {
  const orderId = req.params.id;

  if (!orderId) {
    return res
      .status(400)
      .json({ success: false, message: "Thiếu mã đơn hàng." });
  }

  try {
    const deleted = await Order.findByIdAndDelete(orderId);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn hàng cần hủy." });
    }

    return res.json({
      success: true,
      message: "Đơn hàng đã được hủy thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi hủy đơn hàng:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy đơn hàng. Vui lòng thử lại sau.",
    });
  }
};

module.exports = deleteOrder;
