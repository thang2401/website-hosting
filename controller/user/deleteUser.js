const userModel = require("../../models/userModel");

async function deleteUser(req, res) {
  try {
    const userId = req.params.id;

    const deletedUser = await userModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        message: "Không tìm thấy người dùng",
        success: false,
        error: true,
      });
    }

    res.json({
      message: "Xóa người dùng thành công",
      success: true,
      error: false,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Lỗi khi xóa người dùng",
      success: false,
      error: true,
    });
  }
}

module.exports = deleteUser;
