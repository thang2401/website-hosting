const bcrypt = require("bcryptjs");
const userModel = require("../../models/userModel");

// Regex kiểm tra mật khẩu mạnh
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{12,}$/;

const changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;

    // Kiểm tra đầu vào
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin!",
      });
    }

    // Kiểm tra độ mạnh mật khẩu mới
    if (newPassword.length < 12) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 12 ký tự!",
      });
    }

    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Mật khẩu mới phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt!",
      });
    }

    // Tìm user trong DB
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng!",
      });
    }

    // So sánh mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu cũ không đúng!",
      });
    }

    // 🔒 Kiểm tra mật khẩu mới không trùng mật khẩu cũ
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng với mật khẩu cũ!",
      });
    }

    // Hash và lưu mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "Lỗi server!",
    });
  }
};

module.exports = { changePassword };
