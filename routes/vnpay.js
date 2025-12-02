const crypto = require("crypto");
const axios = require("axios"); // Hoặc fetch API
const moment = require("moment");

// Lấy từ .env
const partnerCode = process.env.MOMO_PARTNER_CODE;
const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;
const createUrl = process.env.MOMO_CREATE_URL;
const returnUrl = process.env.MOMO_RETURN_URL; // http://localhost:3000/payment_result
const ipnUrl = process.env.MOMO_IPN_URL; // http://localhost:8080/api/momo_ipn

exports.momoCreatePaymentUrl = async (req, res) => {
  // 1. Nhận dữ liệu từ Frontend
  const { totalCost } = req.body; // totalCost là tổng tiền VND (không cần nhân 100)

  // ⚠️ BẮT BUỘC: LƯU ĐƠN HÀNG VÀO DB VỚI STATUS 'ĐANG CHỜ XỬ LÝ' TẠI ĐÂY
  const orderId =
    moment().format("YYYYMMDDHHmmss") + Math.floor(Math.random() * 1000); // Mã đơn hàng tạm
  // ... logic lưu đơn hàng ...

  // 2. Chuẩn bị các tham số Momo
  const amount = totalCost; // Đơn vị VND
  const requestId = orderId;
  const orderInfo = `Thanh toan don hang ${orderId}`;
  const extraData = ""; // Có thể dùng để lưu thông tin user/address

  // 3. Tạo chuỗi Raw String
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${ipnUrl}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${partnerCode}` +
    `&redirectUrl=${returnUrl}` +
    `&requestId=${requestId}` +
    `&requestType=captureWallet`; // Sử dụng captureWallet cho thanh toán cơ bản

  // 4. Mã hóa SHA256 (Tạo chữ ký)
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  // 5. Gửi yêu cầu đến API Momo
  const requestBody = JSON.stringify({
    partnerCode,
    accessKey,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: returnUrl,
    ipnUrl,
    extraData,
    requestType: "captureWallet",
    signature,
    lang: "vi",
  });

  try {
    const response = await axios.post(createUrl, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // 6. Trả về paymentUrl cho Frontend
    if (response.data && response.data.payUrl) {
      res.json({ success: true, paymentUrl: response.data.payUrl });
    } else {
      res.json({
        success: false,
        message: response.data.message || "Lỗi tạo liên kết Momo",
      });
    }
  } catch (error) {
    console.error("Lỗi gọi Momo API:", error.response?.data || error.message);
    res
      .status(500)
      .json({ success: false, message: "Lỗi hệ thống khi kết nối Momo." });
  }
};
