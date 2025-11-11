const User = require("../../models/userModel");
const { sendOTP } = require("../../untils/sendOTP");
const bcrypt = require("bcryptjs");

// Kiểm tra mật khẩu mạnh
const isStrongPassword = (pwd) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&()[\]{}^#<>]).{12,}$/;
  return re.test(pwd);
};

// =======================================================
// POST /api/send-otp-to-signup
// Bước 1: Gửi OTP và tạo/cập nhật user tạm
// =======================================================
const sendOtpForSignup = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email không được để trống" });

    const existing = await User.findOne({ email });

    // ✅ Kiểm tra 1: Đã đăng ký hoàn tất chưa?
    if (existing && existing.verified) {
      return res
        .status(400)
        .json({ success: false, message: "Email này đã được đăng ký" });
    }

    // ✅ Kiểm tra 2: Đã xác thực OTP chưa? (otpSignUp=false nhưng chưa verified)
    // Nếu user đã qua bước 2, chặn gửi lại OTP, yêu cầu đặt mật khẩu
    if (
      existing &&
      !existing.verified &&
      existing.otpExpires === null &&
      existing.otp === null
    ) {
      return res.status(400).json({
        success: false,
        message: "Email đã xác thực OTP, vui lòng hoàn tất bước đặt mật khẩu.",
      });
    }

    // Tạo và lưu OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = await User.findOneAndUpdate(
      { email },
      { otp, otpExpires, otpSignUp: true, verified: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Gửi email
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

// =======================================================
// POST /api/verify-otp
// Bước 2: Xác thực OTP
// =======================================================
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

    // ✅ Kiểm tra: Phải đang trong quá trình đăng ký (otpSignUp=true)
    if (!user.otpSignUp) {
      return res
        .status(400)
        .json({ success: false, message: "Yêu cầu xác thực không hợp lệ." });
    }

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

    // ✅ SỬA LỖ HỔNG: TẮT cờ otpSignUp sau khi xác thực thành công
    // Việc này ngăn người dùng gửi lại OTP, và cho phép bước setPassword
    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false; // 👈 TẮT CỜ
    await user.save();

    return res.json({ success: true, message: "OTP hợp lệ", userId: user._id });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server khi xác thực OTP" });
  }
};

// =======================================================
// POST /api/set-password
// Bước 3: Đặt mật khẩu và hoàn tất đăng ký
// =======================================================
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

    // ✅ Kiểm tra 1: User đã hoàn tất đăng ký chưa?
    if (user.verified) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản này đã hoàn tất đăng ký.",
      });
    }

    // ✅ Kiểm tra 2: User đã xác thực OTP chưa?
    // Nếu otpSignUp là true, tức là user chưa qua verifyOtp thành công.
    if (user.otpSignUp) {
      return res.status(400).json({
        success: false,
        message: "Bạn cần xác thực email (verify OTP) trước khi đặt mật khẩu.",
      });
    }

    // Hoàn tất đăng ký
    user.name = name;
    user.password = await bcrypt.hash(password, 10);
    user.verified = true; // Cờ hoàn tất đăng ký
    // user.otpSignUp đã là false từ verifyOtp
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
