// backend/controllers/userController.js
const User = require("../../models/userModel");
const { sendOTP } = require("../../untils/sendOTP");
const bcrypt = require("bcryptjs");

// password strong check
const isStrongPassword = (pwd) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^#<>]).{12,}$/;
  return re.test(pwd);
};

// POST /api/send-otp-to-signup
const sendOtpForSignup = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email không được để trống" });

    // nếu user đã verified (đã hoàn tất signup) => báo lỗi
    const existing = await User.findOne({ email });
    if (existing && existing.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được đăng ký" });
    }

    // tạo hoặc cập nhật user tạm
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { email },
      { otp, otpExpires, otpSignUp: true, verified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // gửi email (bắt lỗi riêng)
    try {
      await sendOTP(email, otp);
    } catch (err) {
      console.error("Lỗi gửi mail:", err);
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email OTP. Kiểm tra cấu hình SMTP.",
      });
    }

    return res.json({
      success: true,
      message: "OTP đã gửi tới email",
      userId: user._id,
    });
  } catch (err) {
    console.error("sendOtpForSignup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server khi gửi OTP" });
  }
};

// POST /api/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu email hoặc OTP" });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Email chưa được gửi OTP" });

    if (
      !user.otp ||
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires < Date.now()
    ) {
      return res
        .status(400)
        .json({ success: false, message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    // mark verified for signup-step, clear otp but keep verified flag until setPassword completes?
    // Here set a flag `otpVerifiedForSignup` by using verified = false + otpSignUp true.
    // Simpler: set otpSignUp=false and set a temp flag 'canSetPassword' -> but to keep DB simple, we'll set verified:true AFTER set-password succeeds.
    // We'll set a short-lived marker in DB: otp = null, otpExpires = null, otpSignUp stays true, return success
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.json({ success: true, message: "OTP hợp lệ", userId: user._id });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xác thực OTP" });
  }
};

// POST /api/set-password
const setPassword = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    if (!email || !password || !name)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin bắt buộc" });

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Mật khẩu phải có ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
      });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User không tồn tại" });

    // ensure user previously requested OTP (otpSignUp true) - prevents arbitrary set password
    if (!user.otpSignUp) {
      return res.status(400).json({
        success: false,
        message: "Bạn cần xác thực email trước (gửi/verify OTP)",
      });
    }

    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.verified = true;
    user.otpSignUp = false;
    await user.save();

    return res.json({ success: true, message: "Đăng ký thành công" });
  } catch (err) {
    console.error("setPassword error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server khi đặt mật khẩu" });
  }
};

module.exports = { sendOtpForSignup, verifyOtp, setPassword };
