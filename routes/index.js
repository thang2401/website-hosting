const express = require("express");

const router = express.Router();

const userSignUpController = require("../controller/user/userSignUp");
const userSignInController = require("../controller/user/userSignIn");
const userDetailsController = require("../controller/user/userDetails");
const authToken = require("../middleware/authToken");
const userLogout = require("../controller/user/userLogout");
const allUsers = require("../controller/user/allUsers");
const updateUser = require("../controller/user/updateUser");
const UploadProductController = require("../controller/product/uploadProduct");
const getProductController = require("../controller/product/getProduct");
const updateProductController = require("../controller/product/updateProduct");
const getCategoryProduct = require("../controller/product/getCategoryProductOne");
const getCategoryWiseProduct = require("../controller/product/getCategoryWiseProduct");
const getProductDetails = require("../controller/product/getProductDetails");
const addToCartController = require("../controller/user/addToCartController");
const countAddToCartProduct = require("../controller/user/countAddToCartProduct");
const addToCartViewProduct = require("../controller/user/addToCartViewProduct");
const updateAddToCartProduct = require("../controller/user/updateAddToCartProduct");
const deleteAddToCartProduct = require("../controller/user/deleteAddToCartProduct");
const searchProduct = require("../controller/product/searchProduct");
const filterProductController = require("../controller/product/filterProduct");
const deleteProductController = require("../controller/product/deleteProductController");
const cleanCart = require("../controller/user/cleanCart");
const payment = require("../controller/user/payment");
const ConfirmPayment = require("../controller/user/confirm-payment");
const getAllOrders = require("../controller/user/getAllOrders");
const deleteUser = require("../controller/user/deleteUser");
const MyOder = require("../controller/user/Oder");
const deleteOrder = require("../controller/user/deleteOrder");
const updateOrderStatus = require("../controller/product/updateOrderStatus");
const {
  forgotPassword,
  resetPassword,
  verifyOTP,
} = require("../controller/forgotpass/forgotPasswordController");
const { changePassword } = require("../controller/user/changePass");

router.post("/signup", userSignUpController);
router.post("/signin", userSignInController);
router.get("/user-details", authToken, userDetailsController);
router.get("/userLogout", userLogout);

//admin
router.get("/all-user", authToken, allUsers);
router.post("/update-user", authToken, updateUser);

router.delete("/delete-user/:id", deleteUser);

//product
router.post("/upload-product", authToken, UploadProductController);
router.get("/get-product", getProductController);
router.post("/update-product", authToken, updateProductController);
router.get("/get-categoryProduct", getCategoryProduct);
router.post("/category-product", getCategoryWiseProduct);
router.post("/product-details", getProductDetails);
router.get("/search", searchProduct);
router.post("/filter-product", filterProductController);
router.delete("/products/:id", deleteProductController);
router.post("/payment", authToken, payment);
router.post("/confirm-payment", authToken, ConfirmPayment);
router.delete("/clean-Cart", authToken, cleanCart);
router.get("/orders", getAllOrders);

//user
router.post("/addtocart", authToken, addToCartController);
router.get("/countAddToCartProduct", authToken, countAddToCartProduct);
router.get("/view-card-product", authToken, addToCartViewProduct);
router.post("/update-cart-product", authToken, updateAddToCartProduct);
router.post("/delete-cart-product", authToken, deleteAddToCartProduct);
router.get("/user/:userId", MyOder);
router.delete("/orders/:id", deleteOrder);

// forgotpass
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);
router.post("/change-password", authToken, changePassword);
// Thay đổi dòng sau (hiện tại bạn dùng POST)
router.put("/orders/:id/status", updateOrderStatus);

module.exports = router;
