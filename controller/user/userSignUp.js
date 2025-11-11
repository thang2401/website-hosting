const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../utils/sendOTP");
const jwt = require("jsonwebtoken");

// --- Gửi OTP để đăng ký ---
const sendOtpToSignUp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập Email" });

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.otpSignUp) {
      return res
        .status(409)
        .json({ success: false, message: "Email đã được sử dụng" });
    }

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      user = new User({ email, otpSignUp: true });
    }

    // Tạo OTP và thời hạn
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    user.otp = otp;
    user.otpExpires = otpExpires;
    user.otpSignUp = true;
    await user.save();

    // Gửi OTP qua email
    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "OTP đã được gửi tới email.",
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server khi gửi OTP" });
  }
};

// --- Hoàn tất đăng ký và xác thực OTP ---
const finalSignUp = async (req, res) => {
  try {
    const { userId, name, password, otp } = req.body;
    if (!userId || !name || !password || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });

    // Kiểm tra OTP
    if (user.otp !== otp || user.otpExpires < Date.now()) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res
        .status(400)
        .json({ success: false, message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.name = name;
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false;
    user.role = "GENERAL";
    await user.save();

    // Tạo token
    const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET_KEY, {
      expiresIn: "7d",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        success: true,
        message: "Đăng ký thành công!",
        token,
        data: { name: user.name, email: user.email, role: user.role },
      });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi hoàn tất đăng ký" });
  }
};

module.exports = { sendOtpToSignUp, finalSignUp };
