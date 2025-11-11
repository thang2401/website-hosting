const mongoose = require("mongoose");
// Đảm bảo đường dẫn này trỏ đúng đến file Order Model của bạn
const Order = require("../../models/Order");

const payment = async (req, res) => {
  try {
    // Lấy dữ liệu từ body
    const { userId, name, phone, address, items } = req.body;

    // 1. Kiểm tra dữ liệu đầu vào cơ bản
    if (
      !userId ||
      !name ||
      !phone ||
      !address ||
      !items ||
      items.length === 0
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không đầy đủ" });
    }

    // 2. Định dạng lại items để chuẩn bị lưu vào Mongoose
    // ✅ SỬA LỖI: Bỏ việc sử dụng 'new mongoose.Types.ObjectId()' thủ công.
    // Mongoose Model sẽ tự chuyển đổi chuỗi ID sang ObjectId khi tạo.
    const formattedItems = items.map((i) => ({
      productId: i.productId, // CHỈ CẦN TRUYỀN CHUỖI ID
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    }));

    // 3. Tạo đơn hàng mới trong Database
    const order = await Order.create({
      userId: userId, // CHỈ CẦN TRUYỀN CHUỖI ID
      name,
      phone,
      address,
      items: formattedItems,
      // Status mặc định là "đang chờ xử lý" theo Schema
    });

    // 4. Phản hồi thành công
    return res.json({
      success: true,
      orderId: order._id,
      message: "Đặt hàng thành công",
    });
  } catch (error) {
    // 🛑 QUAN TRỌNG: In ra lỗi chi tiết để debug
    console.error("Lỗi khi lưu đơn hàng:", error);

    // Nếu lỗi là do validation Mongoose, bạn có thể trả về lỗi 400 cụ thể hơn
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: `Lỗi xác thực dữ liệu: ${error.message}`,
      });
    }

    // Lỗi máy chủ chung
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ. Vui lòng kiểm tra Logs.",
    });
  }
};

module.exports = payment;
