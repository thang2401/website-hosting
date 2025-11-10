const userModel = require("../../models/userModel");

const verifyOTPController = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await userModel.findById(userId);

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Người dùng không tồn tại" });
    if (user.otpSignUp)
      return res
        .status(400)
        .json({ success: false, message: "Email đã được xác thực" });
    if (user.otp !== otp)
      return res
        .status(400)
        .json({ success: false, message: "OTP không đúng" });
    if (Date.now() > user.otpExpires)
      return res
        .status(400)
        .json({ success: false, message: "OTP đã hết hạn" });

    user.otpSignUp = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Xác thực email thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = verifyOTPController;
