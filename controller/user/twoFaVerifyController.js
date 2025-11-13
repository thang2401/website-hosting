// controller/user/twoFaVerifyController.js

const speakeasy = require("speakeasy");
const User = require("../../models/userModel");

const twoFaVerifyController = async (req, res) => {
  const { token } = req.body; // Mã 6 số từ người dùng

  if (!token) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng cung cấp mã 2FA." });
  }

  try {
    // Lấy user và secret 2FA đã lưu tạm thời
    const user = await User.findById(req.user.id).select("+twoFaSecret");

    if (!user || user.role !== "ADMIN" || user.isTwoFaEnabled) {
      return res.status(403).json({
        success: false,
        message: "Truy cập bị từ chối hoặc 2FA đã kích hoạt.",
      });
    }

    if (!user.twoFaSecret) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng thực hiện bước Setup trước.",
      });
    }

    // 1. Xác minh mã TOTP
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: "base32",
      token: token,
      window: 1, // Cho phép sai lệch thời gian 1 bước (30s)
    });

    if (verified) {
      // 2. Kích hoạt 2FA chính thức
      user.isTwoFaEnabled = true;
      // twoFaSecret phải được giữ lại để xác minh đăng nhập sau này
      await user.save();

      return res.status(200).json({
        success: true,
        message: "2FA đã được kích hoạt thành công.",
      });
    } else {
      // 3. Nếu xác minh thất bại, xóa secret key tạm thời
      user.twoFaSecret = undefined;
      await user.save();

      return res.status(400).json({
        success: false,
        message:
          "Mã xác thực không hợp lệ. Vui lòng quét lại mã QR và thử lại.",
      });
    }
  } catch (error) {
    console.error("Lỗi khi xác minh 2FA:", error);
    res.status(500).json({ success: false, message: "Lỗi máy chủ." });
  }
};

module.exports = twoFaVerifyController;
