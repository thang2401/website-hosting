const Cart = require("../../models/cartProduct");
const cleanCart = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId)
      return res.status(400).json({ success: false, message: "Thiếu userId" });

    await Cart.deleteMany({ userId });
    return res.json({ success: true });
  } catch (error) {
    console.error("Lỗi khi xóa giỏ hàng:", error);
    return res.status(500).json({ success: false });
  }
};
module.exports = cleanCart;
