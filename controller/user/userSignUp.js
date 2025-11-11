const userModel = require("../../models/userModel");
const bcrypt = require("bcryptjs");

async function userSignUpController(req, res) {
  try {
    const { email, password, name } = req.body;

    function isStrongPassword(password) {
      // Regex yêu cầu độ dài >= 6. (Giữ nguyên regex, chỉ thay đổi kiểm tra độ dài cứng bên dưới)
      const strongPasswordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{6,}$/;
      return strongPasswordRegex.test(password);
    }

    const user = await userModel.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Tài khoản đã tồn tại.",
      });
    }

    // Validate input
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Vui lòng nhập email" });
    }
    if (!password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Vui lòng nhập mật khẩu",
      });
    }
    // 🛡️ ĐÃ CẬP NHẬT: Yêu cầu mật khẩu tối thiểu 12 ký tự
    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        error: true,
        // Cập nhật thông báo
        message: "Mật khẩu phải trên 12 kí tự",
      });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: true,
        message:
          "Mật khẩu phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt",
      });
    }
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Vui lòng nhập tên" });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);

    // Lưu user
    const payload = {
      ...req.body,
      role: "GENERAL",
      password: hashPassword,
    };

    const userData = new userModel(payload);
    const saveUser = await userData.save();

    res.status(201).json({
      data: saveUser,
      success: true,
      error: false,
      message: "Tạo tài khoản thành công!",
    });
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = userSignUpController;
