const User = require("../../models/userModel.js");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../../untils/sendOTP.js");

// Gửi OTP đến email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "Email không tồn tại" });

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOTP(email, otp);
    res.json({
      success: true,
      message: "OTP đã được gửi đến email",
      expiresIn: 300,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, otp });
    if (!user || user.otpExpires < Date.now())
      return res.json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
      });

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({ success: true, message: "OTP hợp lệ" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// Đặt lại mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.json({ success: false, message: "Email không tồn tại" });

    // Kiểm tra độ mạnh mật khẩu
    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      return res.json({
        success: false,
        message:
          "Mật khẩu phải dài ít nhất 12 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Đặt lại mật khẩu thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { forgotPassword, verifyOTP, resetPassword };
