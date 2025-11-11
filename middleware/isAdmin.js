const User = require("../models/userModel"); // Model User

async function isAdmin(req, res, next) {
  try {
    // Lấy user từ userId đã có trong req
    const user = await User.findById(req.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User không tồn tại" });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Chỉ admin mới có quyền này" });
    }

    // Lưu user vào req để controller dùng nếu cần
    req.user = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
}

module.exports = isAdmin;
