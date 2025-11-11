const express = require("express");
const router = express.Router();
const {
  createPaymentUrl,
  vnpayReturn,
} = require("../controller/paymentController");

router.post("/create_payment_url", createPaymentUrl);
router.get("/vnpay_return", vnpayReturn);

module.exports = router;
