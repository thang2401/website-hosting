const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../../untils/sendOTP"); // Đảm bảo đường dẫn này đúng
// import { sendOTP } from "../../untils/sendOTP"; // Nếu dùng module ES6

// --- 1. HÀM XỬ LÝ ĐĂNG KÝ VÀ GỬI OTP ---
const userSignUpController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập đầy đủ thông tin" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(409)
        .json({ success: false, message: "Email đã được sử dụng" });

    // Kiểm tra mật khẩu mạnh (Nên có logic kiểm tra mật khẩu mạnh ở đây)
    // ...

    const hashPassword = await bcrypt.hash(password, 10);

    // 🔑 TẠO VÀ LƯU OTP VÀO DB
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Mã 6 chữ số
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Hết hạn sau 5 phút

    const user = new User({
      name,
      email,
      password: hashPassword,
      role: "GENERAL",
      otp,
      otpExpires,
      otpSignUp: true, // Đánh dấu cần xác thực
    });
    const saveUser = await user.save();

    // 📧 GỌI HÀM GỬI EMAIL THỰC TẾ
    await sendOTP(email, otp);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công. Mã xác thực đã gửi tới email của bạn.",
      userId: saveUser._id, // Trả về userId để Frontend xác thực
    });
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server trong quá trình đăng ký." });
  }
};

// --- 2. HÀM XỬ LÝ XÁC THỰC OTP ---
const verifySignUpOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);

    // Kiểm tra tính hợp lệ
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
      });
    }

    // Xác thực thành công
    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false; // Đánh dấu tài khoản đã được xác thực
    await user.save();

    res.status(200).json({
      success: true,
      message: "Xác thực email thành công! Bạn có thể đăng nhập.",
    });
  } catch (err) {
    console.error("Lỗi xác thực OTP:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ trong quá trình xác thực.",
    });
  }
};

module.exports = { userSignUpController, verifySignUpOTP };
