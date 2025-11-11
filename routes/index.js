const express = require("express");

const router = express.Router();

// ... (Các imports khác)

const userSignUpController = require("../controller/user/userSignUp");
const userSignInController = require("../controller/user/userSignIn");
const userDetailsController = require("../controller/user/userDetails");
const authToken = require("../middleware/authToken");
const userLogout = require("../controller/user/userLogout");
const allUsers = require("../controller/user/allUsers");
const updateUser = require("../controller/user/updateUser");
const deleteUser = require("../controller/user/deleteUser"); // Đảm bảo import đúng

const UploadProductController = require("../controller/product/uploadProduct");
const getProductController = require("../controller/product/getProduct");
const updateProductController = require("../controller/product/updateProduct");
const getCategoryProduct = require("../controller/product/getCategoryProductOne");
const getCategoryWiseProduct = require("../controller/product/getCategoryWiseProduct");
const getProductDetails = require("../controller/product/getProductDetails");
const deleteProductController = require("../controller/product/deleteProductController");
const updateOrderStatus = require("../controller/product/updateOrderStatus");

const addToCartController = require("../controller/user/addToCartController");
const countAddToCartProduct = require("../controller/user/countAddToCartProduct");
const addToCartViewProduct = require("../controller/user/addToCartViewProduct");
const updateAddToCartProduct = require("../controller/user/updateAddToCartProduct");
const deleteAddToCartProduct = require("../controller/user/deleteAddToCartProduct");
const cleanCart = require("../controller/user/cleanCart");
const payment = require("../controller/user/payment");
const ConfirmPayment = require("../controller/user/confirm-payment");
const getAllOrders = require("../controller/user/getAllOrders");
const MyOder = require("../controller/user/Oder");
const deleteOrder = require("../controller/user/deleteOrder");

const searchProduct = require("../controller/product/searchProduct");
const filterProductController = require("../controller/product/filterProduct");

const {
  forgotPassword,
  resetPassword,
  verifyOTP,
} = require("../controller/forgotpass/forgotPasswordController");
const { changePassword } = require("../controller/user/changePass");

router.post("/signup", userSignUpController);

// DÒNG BỊ LỖI ĐÃ ĐƯỢC LOẠI BỎ: const verifyOTPController = require("../controller/user/verifyOTPController");

// ============================================================
// AUTH & USER
// ============================================================
// --- ROUTES ĐĂNG KÝ MỚI ---

router.post("/signin", userSignInController);
router.get("/user-details", authToken, userDetailsController);
router.get("/userLogout", userLogout);

// ADMIN & USERS
router.get("/all-user", authToken, allUsers);
router.post("/update-user", authToken, updateUser);
router.delete("/delete-user/:id", authToken, deleteUser); // Thêm authToken cho bảo mật

// USER CART & ORDERS
router.post("/addtocart", authToken, addToCartController);
router.get("/countAddToCartProduct", authToken, countAddToCartProduct);
router.get("/view-card-product", authToken, addToCartViewProduct);
router.post("/update-cart-product", authToken, updateAddToCartProduct);
router.post("/delete-cart-product", authToken, deleteAddToCartProduct);
router.delete("/clean-Cart", authToken, cleanCart);

// PAYMENT
router.post("/payment", authToken, payment);
router.post("/confirm-payment", authToken, ConfirmPayment);
router.get("/orders", getAllOrders);
router.get("/user/:userId", MyOder);
router.delete("/orders/:id", authToken, deleteOrder); // Thêm authToken cho bảo mật
router.put("/orders/:id/status", authToken, updateOrderStatus); // Thêm authToken cho bảo mật

// ============================================================
// PRODUCT
// ============================================================
router.post("/upload-product", authToken, UploadProductController);
router.get("/get-product", getProductController);
router.post("/update-product", authToken, updateProductController);
router.get("/get-categoryProduct", getCategoryProduct);
router.post("/category-product", getCategoryWiseProduct);
router.post("/product-details", getProductDetails);
router.get("/search", searchProduct);
router.post("/filter-product", filterProductController);
router.delete("/products/:id", authToken, deleteProductController); // Thêm authToken

// ============================================================
// PASSWORD/2FA
// ============================================================
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP); // Giữ lại verify OTP cho quên mật khẩu
router.post("/reset-password", resetPassword);
router.post("/change-password", authToken, changePassword);
const isAdmin = require("../middleware/isAdmin");
const deleteOrderController = require("../controller/user/AdminDeleteOder");

router.delete("/delete-orders/:id", deleteOrderController);

// DÒNG BỊ LỖI TRÙNG LẶP ĐÃ ĐƯỢC LOẠI BỎ: router.post("/verify-otp", verifyOTPController);

module.exports = router;
