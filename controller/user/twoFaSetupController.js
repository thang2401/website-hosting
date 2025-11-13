// controller/user/twoFaSetupController.js

const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../../models/userModel");

const twoFaSetupController = async (req, res) => {
  try {
    // Lấy user (đã được xác thực qua authToken) và cả trường twoFaSecret
    const user = await User.findById(req.user.id).select("+twoFaSecret");

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Chức năng này chỉ dành cho Admin.",
      });
    }

    if (user.isTwoFaEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA đã được kích hoạt cho tài khoản này.",
      });
    }

    // 1. Tạo Secret Key
    const secret = speakeasy.generateSecret({
      name: "Ten_App_Admin_Portal", // Thay bằng tên ứng dụng của bạn
      issuer: "Ecommerce",
      length: 20,
    });

    // 2. Tạo URL cho mã QR
    const otpauthUrl = secret.otpauth_url;

    // 3. Tạo mã QR dưới dạng Data URL (chuỗi base64)
    const qrCodeImage = await QRCode.toDataURL(otpauthUrl);

    // 4. Lưu secret key TẠM THỜI vào database
    user.twoFaSecret = secret.base32;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Quét mã QR. Sau đó gọi /2fa/verify để kích hoạt.",
      secret: secret.base32,
      qrCodeImage: qrCodeImage,
    });
  } catch (error) {
    console.error("Lỗi khi thiết lập 2FA:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ khi thiết lập 2FA." });
  }
};

module.exports = twoFaSetupController;
