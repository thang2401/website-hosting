const bcrypt = require("bcryptjs");
const userModel = require("../../models/userModel");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy"); // Import thư viện 2FA

async function userSignInController(req, res) {
  try {
    // Thêm twoFactorToken vào destructuring
    const { email, password, twoFactorToken } = req.body;

    if (!email) {
      throw new Error("Vui lòng cung email");
    }
    if (!password) {
      throw new Error("Vui lòng cung mật khẩu");
    }

    // Cần lấy cả password và twoFaSecret (đã select: false trong model)
    const user = await userModel
      .findOne({ email })
      .select("+password +twoFaSecret");

    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    // 1. Xác thực mật khẩu
    const checkPassword = await bcrypt.compare(password, user.password);

    if (checkPassword) {
      // --- BƯỚC KIỂM TRA 2FA CHO ADMIN ĐÃ KÍCH HOẠT ---
      if (user.role === "ADMIN" && user.isTwoFaEnabled) {
        if (!twoFactorToken) {
          // Lần đăng nhập đầu tiên: Yêu cầu mã 2FA
          return res.status(401).json({
            success: false,
            requires2FA: true, // Cờ báo hiệu client cần gửi mã 2FA
            message: "Yêu cầu mã xác thực 2FA.",
          });
        }

        // Xác minh mã 2FA
        const verified = speakeasy.totp.verify({
          secret: user.twoFaSecret,
          encoding: "base32",
          token: twoFactorToken,
          window: 1,
        });

        if (!verified) {
          throw new Error("Mã 2FA không đúng!");
        }
      }
      // --- KẾT THÚC KIỂM TRA 2FA ---

      // 2. Nếu vượt qua mọi xác minh (kể cả 2FA), tạo JWT
      const tokenData = {
        _id: user._id,
        email: user.email,
        // Không đưa vai trò vào token nếu không cần thiết
      };

      const token = await jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
        expiresIn: 60 * 60 * 8,
      });

      const tokenOption = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
      };

      res
        .cookie("token", token, tokenOption)
        .status(200)
        .json({
          message: "Đăng nhập thành công!",
          data: token,
          success: true,
          error: false,
          user: {
            _id: user._id,
            email: user.email,
            role: user.role,
            isTwoFaEnabled: user.isTwoFaEnabled,
          },
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
