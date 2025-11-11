const express = require("express");
const router = express.Router();
const moment = require("moment");
const crypto = require("crypto");
const querystring = require("qs");

// Hàm hỗ trợ sắp xếp các tham số theo thứ tự alphabet
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// =========================================================
// [1] API TẠO URL THANH TOÁN (POST /api/vnpay/create_payment_url)
// =========================================================
router.post("/create_payment_url", (req, res) => {
  // Giả định dữ liệu nhận được từ React
  const { amount, orderInfo: receivedOrderInfo, bankCode } = req.body; // Đổi tên biến để sử dụng OrderInfo đã làm sạch // Lấy thông tin cấu hình từ biến môi trường

  const tmnCode = process.env.VNP_TMN_CODE;
  const secretKey = process.env.VNP_HASH_SECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");
  const orderId = moment(date).format("DDHHmmss"); // Mã giao dịch
  const currCode = "VND";
  const locale = "vn";

  const ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress; // ⭐ FIX 1: Làm tròn và chuyển đổi amount sang đồng (cents)

  const vnp_Amount_SAFE = Math.round(amount) * 100; // ⭐ FIX 2: Rút gọn OrderInfo để tránh lỗi 404 do URL quá dài/ký tự đặc biệt
  const vnp_OrderInfo_SAFE = `Thanh toan DH-${orderId}`;
  let vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Amount: vnp_Amount_SAFE, // Sử dụng giá trị đã làm sạch
    vnp_CurrCode: currCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: vnp_OrderInfo_SAFE, // Sử dụng giá trị đã rút gọn
    vnp_OrderType: "other",
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode && bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  } // 2. Sắp xếp các tham số và tạo Secure Hash

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha256", secretKey);
  const signed = hmac.update(signData).digest("hex"); // 3. Tạo URL cuối cùng

  vnp_Params["vnp_SecureHash"] = signed;
  const paymentUrl =
    vnpUrl + "?" + querystring.stringify(vnp_Params, { encode: true });

  console.log("Generated VNPay URL:", paymentUrl); // Ghi log để kiểm tra // 4. Trả về URL thanh toán cho React

  res.json({
    paymentUrl: paymentUrl,
    orderId: orderId,
  });
});

// =========================================================
// [2] API XỬ LÝ KẾT QUẢ TRẢ VỀ (GET /api/vnpay/vnpay_return)
// =========================================================
router.get("/vnpay_return", (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params["vnp_SecureHash"];
  const secretKey = process.env.VNP_HASH_SECRET;
  const reactReturnUrl = process.env.VNP_RETURN_URL; // 1. Loại bỏ các tham số không dùng để tạo hash

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"]; // 2. Sắp xếp và tạo lại chữ ký để xác thực

  vnp_Params = sortObject(vnp_Params);
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha256", secretKey);
  const signed = hmac.update(signData).digest("hex"); // 3. Xử lý logic

  if (secureHash === signed) {
    // Chữ ký hợp lệ
    const RspCode = vnp_Params["vnp_ResponseCode"];
    const orderId = vnp_Params["vnp_TxnRef"];
    const amount = vnp_Params["vnp_Amount"] / 100;

    if (RspCode === "00") {
      // Thanh toán thành công.
      // KHUYẾN NGHỊ: Cập nhật trạng thái đơn hàng ở API IPN.
      return res.redirect(
        `${reactReturnUrl}?status=success&orderId=${orderId}&amount=${amount}`
      );
    } else {
      // Thanh toán thất bại
      return res.redirect(
        `${reactReturnUrl}?status=failed&orderId=${orderId}&message=${RspCode}`
      );
    }
  } else {
    // Chữ ký không hợp lệ
    return res.redirect(`${reactReturnUrl}?status=error&message=Lỗi bảo mật`);
  }
});

module.exports = router;
