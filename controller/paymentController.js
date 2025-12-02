// controllers/paypalController.js (Chức năng tạo Order)
const getPaypalAccessToken = require("../utils/paypal");
// Giả định bạn có logic để lưu Order vào DB tại đây.
// const Order = require('../models/Order');

exports.paypalCreateOrder = async (req, res) => {
  try {
    const { totalCost, items, ...userData } = req.body;
    const accessToken = await getPaypalAccessToken();

    // ⚠️ Lưu ý: PayPal thường dùng USD. Cần đảm bảo totalCost là USD hoặc tiền tệ hợp lệ.
    const currencyCode = "USD";
    const orderId = `ORDER-${Date.now()}`; // Mã order tạm thời của hệ thống

    // 1. **LƯU ORDER VÀO DB** với status 'đang chờ thanh toán'
    // ... logic Order.create({ orderId, ... }) ...

    // 2. Chuẩn bị Payload gửi PayPal
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currencyCode,
            value: totalCost.toFixed(2), // Bắt buộc phải là chuỗi có 2 chữ số thập phân
          },
          custom_id: orderId, // Đính kèm Order ID của hệ thống bạn
          description: `Thanh toán cho đơn hàng ${orderId}`,
        },
      ],
    };

    const response = await fetch(
      `${process.env.PAYPAL_API_BASE}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      }
    );

    const orderData = await response.json();

    if (response.status !== 201) {
      throw new Error(orderData.message || "Lỗi tạo Order PayPal.");
    }

    // Trả về PayPal Order ID
    res.status(201).json({ success: true, orderID: orderData.id });
  } catch (error) {
    console.error("Lỗi tạo Order PayPal:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
// controllers/paypalController.js (Chức năng Capture Order)
// ...
exports.paypalCaptureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await getPaypalAccessToken();

    // 1. Gọi API PayPal để Capture Order
    const response = await fetch(
      `${process.env.PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await response.json();

    if (captureData.status === "COMPLETED") {
      const systemOrderId =
        captureData.purchase_units[0].payments.captures[0].custom_id;

      // 2. **CẬP NHẬT ĐƠN HÀNG VÀ XÓA GIỎ HÀNG**
      // Ví dụ: await Order.findOneAndUpdate({ custom_id: systemOrderId }, { status: "đã xác nhận" });
      // Ví dụ: await Cart.deleteOne({ userId: userData.userId });

      res.json({
        success: true,
        message: "Thanh toán PayPal hoàn tất.",
        systemOrderId,
      });
    } else {
      // Thanh toán bị lỗi hoặc đang chờ
      res
        .status(400)
        .json({
          success: false,
          message: "Giao dịch không hoàn tất hoặc đang chờ.",
          captureData,
        });
    }
  } catch (error) {
    console.error("Lỗi Capture Order PayPal:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Lỗi hệ thống khi chốt giao dịch PayPal.",
      });
  }
};
