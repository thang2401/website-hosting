const Order = require("../../models/Order");

const payment = async (req, res) => {
  try {
    const { userId, name, phone, address, items } = req.body;

    if (!userId || !name || !phone || !address || !items?.length) {
      return res
        .status(400)
        .json({ success: false, message: "Dữ liệu không đầy đủ" });
    }

    await Order.create({ userId, name, phone, address, items });
    return res.json({ success: true });
  } catch (error) {
    console.error("Lỗi khi lưu đơn hàng:", error);
    return res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

module.exports = payment;
