const moment = require("moment");
const qs = require("querystring");
const crypto = require("crypto");

/**
 * @desc Tạo URL thanh toán VNPAY
 * @route POST /api/payment/create_payment_url
 */
const createPaymentUrl = async (req, res) => {
  try {
    const { amount, bankCode, orderInfo } = req.body;

    // Cấu hình VNPay từ .env
    const vnp_TmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    const createDate = moment().format("YYYYMMDDHHmmss");
    const orderId = "DH_" + Date.now();

    // Xử lý IP
    let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    if (ipAddr && ipAddr.includes("::ffff:"))
      ipAddr = ipAddr.split("::ffff:")[1];
    if (ipAddr === "::1") ipAddr = "127.0.0.1";

    // ======= Sửa vnp_OrderInfo =======
    // Dùng Base64 để gửi Unicode, VNPay chấp nhận ký tự Latin + số + = + /
    let safeOrderInfo = orderInfo || "Thanh toan don hang";
    safeOrderInfo = Buffer.from(safeOrderInfo).toString("base64");

    // Params thanh toán
    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: safeOrderInfo,
      vnp_OrderType: "other",
      vnp_Amount: Math.round(Number(amount)) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params.vnp_BankCode = bankCode;

    // Sắp xếp params theo chữ cái
    const sortedKeys = Object.keys(vnp_Params).sort();
    const sortedParams = {};
    sortedKeys.forEach((key) => {
      sortedParams[key] = vnp_Params[key];
    });

    // Tạo chuỗi ký HMAC đúng chuẩn VNPay
    const signData = sortedKeys
      .map((key) => `${key}=${sortedParams[key]}`)
      .join("&");
    const hmac = crypto.createHmac("sha512", secretKey);
    const vnp_SecureHash = hmac.update(signData).digest("hex");
    sortedParams.vnp_SecureHash = vnp_SecureHash;

    // Tạo URL thanh toán cuối cùng
    const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, {
      encode: false,
    })}`;

    res.json({ paymentUrl });
  } catch (err) {
    console.error("Lỗi khi tạo URL VNPay:", err);
    res.status(500).json({ message: "Lỗi server khi tạo URL VNPay" });
  }
};

/**
 * @desc Xử lý kết quả trả về từ VNPAY (VNPay Return)
 * @route GET /api/payment/vnpay_return
 */
const vnpayReturn = async (req, res) => {
  try {
    const vnp_Params = { ...req.query };
    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    const secretKey = process.env.VNP_HASH_SECRET;

    // Sắp xếp và tạo chữ ký kiểm tra
    const sortedKeys = Object.keys(vnp_Params).sort();
    const sortedParams = {};
    sortedKeys.forEach((key) => (sortedParams[key] = vnp_Params[key]));
    const signData = sortedKeys
      .map((key) => `${key}=${sortedParams[key]}`)
      .join("&");
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(signData).digest("hex");

    const frontendSuccessUrl =
      process.env.FRONTEND_SUCCESS_URL ||
      "https://domanhhung.id.vn/payment-success";
    const frontendFailedUrl =
      process.env.FRONTEND_FAILED_URL ||
      "https://domanhhung.id.vn/payment-failed";

    if (secureHash === signed) {
      const vnp_ResponseCode = vnp_Params.vnp_ResponseCode;

      if (vnp_ResponseCode === "00") {
        // Giải mã orderInfo nếu cần
        const decodedOrderInfo = Buffer.from(
          vnp_Params.vnp_OrderInfo,
          "base64"
        ).toString("utf-8");

        return res.redirect(
          `${frontendSuccessUrl}?orderId=${vnp_Params.vnp_TxnRef}&amount=${
            vnp_Params.vnp_Amount / 100
          }&orderInfo=${encodeURIComponent(decodedOrderInfo)}`
        );
      } else {
        return res.redirect(`${frontendFailedUrl}?message=${vnp_ResponseCode}`);
      }
    } else {
      return res.redirect(`${frontendFailedUrl}?message=INVALID_SIGNATURE`);
    }
  } catch (err) {
    console.error("Lỗi xử lý VNPay return:", err);
    res.status(500).send("Lỗi xử lý VNPay return");
  }
};

module.exports = { createPaymentUrl, vnpayReturn };
