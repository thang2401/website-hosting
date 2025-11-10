const Product = require("../../models/productModel");

const deleteProductController = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    return res.json({
      success: true,
      message: "Xóa sản phẩm thành công",
      data: deletedProduct,
    });
  } catch (error) {
    console.error("Lỗi backend:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa sản phẩm",
    });
  }
};

module.exports = deleteProductController;
