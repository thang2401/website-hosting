const bcrypt = require("bcryptjs");
const userModel = require("../../models/userModel");
const jwt = require("jsonwebtoken");

async function userSignInController(req, res) {
  try {
    const { email, password } = req.body;

    if (!email) {
      throw new Error("Vui lòng cung email");
    }
    if (!password) {
      throw new Error("Vui lòng cung mật khẩu");
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      throw new Error("Người dùng khôn tồn tại");
    }

    const checkPassword = await bcrypt.compare(password, user.password);

    console.log("checkPassoword", checkPassword);

    if (checkPassword) {
      const tokenData = {
        _id: user._id,
        email: user.email,
      };
      const token = await jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
        expiresIn: 60 * 60 * 8,
      });

      const tokenOption = {
        httpOnly: true,
        secure: true,
        // ✅ ĐÃ SỬA LỖI 401: Bắt buộc phải có để gửi cookie giữa các miền/subdomain qua HTTPS
        sameSite: "None",
      };

      res.cookie("token", token, tokenOption).status(200).json({
        message: "Đăng nhập thành công!",
        data: token,
        success: true,
        error: false,
      });
    } else {
      throw new Error("Mật khẩu không đúng!");
    }
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = userSignInController;
