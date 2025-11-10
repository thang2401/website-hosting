const Order = require("../../models/Order");
const User = require("../../models/userModel");
const Product = require("../../models/productModel"); // Đảm bảo đã đăng ký đúng model "Product"

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email") // Lấy tên + email người đặt
      .populate("items.productId", "productName price") // Lấy tên + giá sản phẩm
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy đơn hàng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy đơn hàng",
      error: error.message,
    });
  }
};

module.exports = getAllOrders;
