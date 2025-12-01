const crypto = require("crypto");
const axios = require("axios");
const moment = require("moment"); // Giữ lại moment nếu cần cho các logic khác, nhưng không bắt buộc cho Momo

// Hàm tạo chữ ký (Signature) bằng HMAC SHA256
const hashMomo = (data, secretKey) => {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
};

/**
 * @desc Tạo Request thanh toán Momo và nhận URL chuyển hướng
 * @route POST /api/payment/create_momo_request
 */
const createMomoRequest = async (req, res) => {
  try {
    // 1. Lấy dữ liệu đầu vào
    const { amount, orderInfo, extraData = "" } = req.body;

    // Kiểm tra đầu vào
    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) < 1) {
      return res
        .status(400)
        .json({ message: "Số tiền thanh toán không hợp lệ hoặc bị thiếu." });
    }

    // 2. Lấy cấu hình từ .env (QUAN TRỌNG)
    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const momoApiUrl =
      process.env.MOMO_API_URL ||
      "https://test-payment.momo.vn/v2/gateway/api/create";
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl = process.env.MOMO_IPN_URL;

    if (!partnerCode || !secretKey || !accessKey || !redirectUrl || !ipnUrl) {
      console.error("MOMO CONFIG ERROR: Thiếu biến môi trường cấu hình Momo.");
      return res
        .status(500)
        .json({ message: "Lỗi cấu hình Momo: Vui lòng kiểm tra file .env" });
    }

    // 3. Chuẩn bị dữ liệu
    const requestType = "captureWallet";
    const rawAmount = parseInt(amount); // Momo nhận đơn vị VND
    const orderId = partnerCode + "_" + new Date().getTime();
    const requestId = orderId;
    const lang = "vi";

    // 4. Tạo chuỗi ký (Raw Signature String)
    // PHẢI THEO ĐÚNG THỨ TỰ ALPHABETICAL (A-Z)
    const rawSignature = `accessKey=${accessKey}&amount=${rawAmount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${
      orderInfo || "Thanh toan don hang"
    }&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    // 5. Mã hóa (Hashing)
    const signature = hashMomo(rawSignature, secretKey);

    // 6. Tạo payload JSON
    const payload = {
      partnerCode: partnerCode,
      accessKey: accessKey,
      requestId: requestId,
      amount: rawAmount,
      orderId: orderId,
      orderInfo: orderInfo || "Thanh toan don hang",
      redirectUrl: redirectUrl,
      ipnUrl: ipnUrl,
      extraData: extraData,
      requestType: requestType,
      signature: signature,
      lang: lang,
    };

    // 7. Gửi request đến Momo API
    const response = await axios.post(momoApiUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // 8. Xử lý phản hồi
    const momoResponse = response.data;

    if (momoResponse.resultCode === 0 && momoResponse.payUrl) {
      // Thành công, trả về URL để client chuyển hướng đến cổng Momo
      return res.json({ payUrl: momoResponse.payUrl });
    } else {
      // Lỗi từ Momo
      console.error("Momo API Error:", momoResponse);
      return res.status(400).json({
        message: momoResponse.message || "Lỗi không xác định từ Momo API",
        resultCode: momoResponse.resultCode,
      });
    }
  } catch (err) {
    console.error("Lỗi khi tạo yêu cầu Momo:", err.message);
    res.status(500).json({ message: "Lỗi server khi tạo yêu cầu Momo" });
  }
};

// ----------------------------------------------------------------------
// Hàm 2: Xử lý Thông báo Giao dịch (IPN) - Quan trọng để xác nhận kết quả
// ----------------------------------------------------------------------
const momoIpn = async (req, res) => {
  try {
    const momoData = req.body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    // Chuỗi ký IPN
    const rawSignature = `accessKey=${momoData.accessKey}&amount=${momoData.amount}&extraData=${momoData.extraData}&message=${momoData.message}&orderId=${momoData.orderId}&orderInfo=${momoData.orderInfo}&orderType=${momoData.orderType}&partnerCode=${momoData.partnerCode}&payType=${momoData.payType}&requestId=${momoData.requestId}&responseTime=${momoData.responseTime}&resultCode=${momoData.resultCode}&transId=${momoData.transId}&requestType=${momoData.requestType}`;

    const expectedSignature = hashMomo(rawSignature, secretKey);

    // So sánh chữ ký
    if (expectedSignature === momoData.signature) {
      if (momoData.resultCode === 0) {
        console.log(
          `✅ Momo IPN Success for Order: ${momoData.orderId}. TransId: ${momoData.transId}`
        );
        // >>> LOGIC CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG TRONG DATABASE CỦA BẠN <<<

        return res.json({ message: "IPN received", resultCode: 0 });
      } else {
        console.warn(
          `⚠️ Momo IPN Failed for Order: ${momoData.orderId}. ResultCode: ${momoData.resultCode}`
        );
        return res.json({ message: "IPN received", resultCode: 0 }); // Vẫn trả về 0 để Momo không gửi lại
      }
    } else {
      console.error("❌ Momo IPN ERROR: Invalid signature.");
      return res
        .status(400)
        .json({ message: "Invalid signature", resultCode: 99 });
    }
  } catch (err) {
    console.error("Lỗi xử lý Momo IPN:", err);
    res.status(500).json({ message: "Server error during IPN processing." });
  }
};

module.exports = { createMomoRequest, momoIpn };
