const User = require("../../models/userModel");
const bcrypt = require("bcryptjs");
const { sendOTP } = require("../../untils/sendOTP"); // Đảm bảo đúng đường dẫn
const jwt = require("jsonwebtoken"); // Cần để tạo token sau khi đăng ký thành công

// --- HÀM 1: GỬI OTP VÀ TẠO BẢN GHI TẠM THỜI (API: /api/send-otp-to-signup) ---
const sendOtpToSignUpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập Email" });

    // 1. Kiểm tra Email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.otpSignUp) {
      // Nếu đã tồn tại và đã xác thực
      return res
        .status(409)
        .json({ success: false, message: "Email đã được sử dụng" });
    }

    // Nếu tồn tại nhưng chưa xác thực, ta sẽ cập nhật bản ghi đó.
    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      // 2. Tạo bản ghi TẠM THỜI (chỉ có Email)
      user = new User({ email, otpSignUp: true }); // otpSignUp = true: Bản ghi cần xác thực
    }

    // 3. Tạo và lưu OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    user.otp = otp;
    user.otpExpires = otpExpires;
    const saveUser = await user.save();

    // 4. Gửi Email
    await sendOTP(email, otp);

    res.status(200).json({
      success: true,
      message: "Mã xác thực đã gửi tới email. Vui lòng kiểm tra hộp thư.",
      userId: saveUser._id, // Trả về userId TẠM THỜI
    });
  } catch (err) {
    console.error("Lỗi gửi OTP:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi gửi OTP." });
  }
};

// --- HÀM 2: HOÀN TẤT ĐĂNG KÝ VÀ XÁC THỰC OTP (API: /api/final-signup) ---
const finalSignUpController = async (req, res) => {
  try {
    const { userId, name, email, password, otp } = req.body;

    if (!userId || !name || !email || !password || !otp)
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin và OTP",
      });

    const user = await User.findById(userId);

    // 1. Kiểm tra OTP
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      // Nếu OTP sai, xóa OTP để người dùng phải gửi lại
      if (user) {
        user.otp = null;
        user.otpExpires = null;
        await user.save();
      }
      return res.status(400).json({
        success: false,
        message:
          "Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại OTP.",
      });
    }

    // 2. Kiểm tra lại Email đã bị sử dụng bởi tài khoản khác chưa (phòng trường hợp race condition)
    // ...

    // 3. Hoàn tất tạo tài khoản
    const hashPassword = await bcrypt.hash(password, 10);

    user.name = name;
    user.password = hashPassword;
    user.otp = null;
    user.otpExpires = null;
    user.otpSignUp = false; // Đánh dấu đã xác thực và là tài khoản chính thức
    user.role = "GENERAL";

    await user.save();

    // 4. Tạo token và đăng nhập luôn
    const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET_KEY, {
      expiresIn: "7d",
    });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      })
      .status(200)
      .json({
        success: true,
        message: "Đăng ký và xác thực thành công!",
        data: { name: user.name, email: user.email, role: user.role },
        token,
      });
  } catch (err) {
    console.error("Lỗi hoàn tất đăng ký:", err);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi hoàn tất đăng ký." });
  }
};

module.exports = { sendOtpToSignUpController, finalSignUpController };
