const express = require("express");
const router = express.Router();
const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");

module.exports = router;
