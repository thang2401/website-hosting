const express = require("express");
const Cart = require("../../models/cartProduct");

async function ConfirmPayment(req, res) {
  const { userId } = req.body;
  if (!userId)
    return res.status(400).json({ success: false, message: "Thiếu userId" });

  const cart = await Cart.find({ userId });
  if (!cart.length)
    return res.status(400).json({ success: false, message: "Giỏ hàng trống" });

  return res.json({ success: true });
}

module.exports = ConfirmPayment;
