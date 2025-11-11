// controllers/authController.js
const userModel = require("../../models/userModel");
const { sendOTP } = require("../../untils/sendOTP");
const bcrypt = require("bcryptjs");

// Hàm kiểm tra mật khẩu mạnh
const isStrongPassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^#<>]).{12,}$/;
  return regex.test(password);
};

// --- Bước 1: gửi OTP ---
const sendOtpToSignUpController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email không được để trống" });

    // Check nếu email đã đăng ký hoàn tất
    const existingUser = await userModel.findOne({ email, otpSignUp: false });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được đăng ký" });

    // Tạo tạm user nếu chưa có
    let user = await userModel.findOne({ email });
    if (!user) user = new userModel({ email, otpSignUp: true });

    // Sinh OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    user.otpSignUp = true;
    await user.save();

    await sendOTP(email, otp);

    res.json({
      success: true,
      message: "OTP đã gửi tới email",
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Lỗi server khi gửi OTP" });
  }
};

// --- Bước 2: xác nhận OTP + nhập password ---
const finalSignUpController = async (req, res) => {
  try {
    const { userId, name, password, confirmPassword, otp } = req.body;

    if (!userId || !name || !password || !confirmPassword || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin" });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu xác nhận không khớp" });

    if (!isStrongPassword(password))
      return res.status(400).json({
        success: false,
        message:
          "Mật khẩu phải có ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
      });

    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User không tồn tại" });

    if (user.otp !== otp || user.otpExpires < Date.now())
      return res
        .status(400)
        .json({ success: false, message: "OTP không hợp lệ hoặc đã hết hạn" });

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false;
    await user.save();

    res.json({ success: true, message: "Đăng ký thành công" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi hoàn tất đăng ký" });
  }
};

module.exports = { sendOtpToSignUpController, finalSignUpController };
