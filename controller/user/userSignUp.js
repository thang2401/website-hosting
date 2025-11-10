const bcrypt = require("bcryptjs");
const userModel = require("../../models/userModel");
const nodemailer = require("nodemailer");

const userSignUpController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin",
      });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res
        .status(400)
        .json({ success: false, message: "Email không hợp lệ" });

    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ success: false, message: "Email đã được sử dụng" });

    // Mật khẩu mạnh
    if (
      password.length < 12 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[\W_]/.test(password)
    )
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu yếu, vui lòng thử lại" });

    const hashPassword = bcrypt.hashSync(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const user = new userModel({
      name,
      email,
      password: hashPassword,
      otp,
      otpExpires,
    });
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Mã OTP xác thực email",
      html: `<p>Mã OTP của bạn là: <b>${otp}</b>. Hết hạn trong 5 phút.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "OTP đã được gửi tới email",
      email,
      userId: user._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: "Đăng ký thất bại",
      error: err.message,
    });
  }
};

module.exports = userSignUpController;
