const jwt = require("jsonwebtoken");

async function authToken(req, res, next) {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    console.log("🔹 Token nhận được:", token);

    if (!token) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập!",
        error: true,
        success: false,
      });
    }

    jwt.verify(token, process.env.TOKEN_SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log("❌ Token không hợp lệ:", err.message);
        return res.status(401).json({
          message: "Mã thông báo không hợp lệ hoặc hết hạn!",
          error: true,
          success: false,
        });
      }

      req.userId = decoded?._id;
      console.log("✅ Token hợp lệ. User ID:", req.userId);
      next();
    });
  } catch (err) {
    console.error("❌ Lỗi xác thực token:", err.message);
    res.status(500).json({
      message: err.message || "Lỗi!",
      error: true,
      success: false,
    });
  }
}

module.exports = authToken;
