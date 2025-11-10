const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../../untils/sendOTP");

const userSignUpController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.json({ success: false, message: "Email không hợp lệ" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "Email đã được sử dụng" });

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/;
    if (!strongPasswordRegex.test(password))
      return res.json({ success: false, message: "Mật khẩu yếu" });

    const hashPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(10000 + Math.random() * 90000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = new User({
      name,
      email,
      password: hashPassword,
      otp,
      otpExpires,
      otpSignUp: true,
    });
    await user.save();

    await sendOTP(email, otp);

    res.json({
      success: true,
      message: "Đăng ký thành công. OTP đã gửi tới email",
      email,
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

const verifySignUpOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);

    if (!user || user.otp !== otp || user.otpExpires < Date.now())
      return res.json({
        success: false,
        message: "OTP không hợp lệ hoặc đã hết hạn",
      });

    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false;
    await user.save();

    res.json({ success: true, message: "Xác thực email thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

module.exports = { userSignUpController, verifySignUpOTP };
