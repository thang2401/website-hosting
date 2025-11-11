const userModel = require("../../models/userModel");
const { sendOTP } = require("../../utils/sendOTP");
const bcrypt = require("bcryptjs");

const sendOtpToSignUpController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email không được để trống" });

    let user = await userModel.findOne({ email });
    if (!user) user = new userModel({ email, otpSignUp: true });

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

const finalSignUpController = async (req, res) => {
  try {
    const { userId, name, password, otp } = req.body;
    if (!userId || !name || !password || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Thiếu thông tin" });

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
