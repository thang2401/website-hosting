const Order = require("../../models/Order");

async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp trạng thái mới",
      });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    res.json({
      success: true,
      message: `Cập nhật trạng thái đơn hàng thành công: ${status}`,
      data: updatedOrder,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Lỗi khi cập nhật trạng thái đơn hàng",
    });
  }
}

module.exports = updateOrderStatus;
