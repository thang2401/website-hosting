const moment = require("moment");
const qs = require("querystring");
const crypto = require("crypto");

/**
 * @desc Tạo URL thanh toán VNPAY
 * @route POST /api/payment/create_payment_url
 */
const createPaymentUrl = async (req, res) => {
  try {
    // 1. Lấy dữ liệu đầu vào
    const { amount, bankCode, orderInfo } = req.body;

    // 2. Khai báo các biến cấu hình từ .env
    const vnp_TmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    // 3. Chuẩn bị dữ liệu thanh toán
    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = "DH_" + Date.now(); // Mã đơn hàng duy nhất

    // Xử lý IP Address: Ưu tiên IPv4 và xử lý ::1
    let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    if (ipAddr && ipAddr.includes("::ffff:")) {
      ipAddr = ipAddr.split("::ffff:")[1];
    }
    if (ipAddr === "::1") {
      ipAddr = "127.0.0.1";
    }

    // 4. Khởi tạo Params
    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      // Đảm bảo mã hóa URL cho vnp_OrderInfo để tránh lỗi ký tự đặc biệt
      vnp_OrderInfo: encodeURIComponent(orderInfo || "Thanh toan donhang"),
      vnp_OrderType: "other",
      // Đảm bảo là số nguyên và nhân 100 (đơn vị VNPay là đồng)
      vnp_Amount: parseInt(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

    // 5. Sắp xếp Params
    // Các tham số phải được sắp xếp theo thứ tự bảng chữ cái để tạo chuỗi ký
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => ((obj[key] = vnp_Params[key]), obj), {});

    // 6. Tạo chuỗi dữ liệu ký và chữ ký (Secure Hash)
    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    sortedParams["vnp_SecureHash"] = signed;

    // 7. Tạo URL thanh toán cuối cùng
    const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, {
      encode: true,
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
    const vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    // Loại bỏ các tham số không dùng để kiểm tra hash
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const secretKey = process.env.VNP_HASH_SECRET;

    // 1. Sắp xếp Params để tạo chuỗi dữ liệu
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => ((obj[key] = vnp_Params[key]), obj), {});

    // 2. Tạo chữ ký để so sánh
    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // 3. So sánh chữ ký
    if (secureHash === signed) {
      // Chữ ký hợp lệ

      const vnp_ResponseCode = vnp_Params["vnp_ResponseCode"];

      // >>> BƯỚC QUAN TRỌNG: XỬ LÝ DATABASE TẠI ĐÂY <<<
      // Lấy vnp_TxnRef để tìm đơn hàng và cập nhật trạng thái

      const frontendSuccessUrl =
        process.env.FRONTEND_SUCCESS_URL ||
        "https://domanhhung.id.vn/payment-success";
      const frontendFailedUrl =
        process.env.FRONTEND_FAILED_URL ||
        "https://domanhhung.id.vn/payment-failed";

      if (vnp_ResponseCode === "00") {
        // 00: Thanh toán thành công
        return res.redirect(
          `${frontendSuccessUrl}?orderId=${vnp_Params["vnp_TxnRef"]}&amount=${
            vnp_Params["vnp_Amount"] / 100
          }`
        );
      } else {
        // Mã khác 00: Thanh toán thất bại hoặc lỗi giao dịch
        return res.redirect(`${frontendFailedUrl}?message=${vnp_ResponseCode}`);
      }
    } else {
      // Chữ ký không hợp lệ
      const frontendFailedUrl =
        process.env.FRONTEND_FAILED_URL ||
        "https://domanhhung.id.vn/payment-failed";
      return res.redirect(`${frontendFailedUrl}?message=INVALID_SIGNATURE`);
    }
  } catch (err) {
    console.error("Lỗi xử lý VNPay return:", err);
    res.status(500).send("Lỗi xử lý VNPay return");
  }
};

module.exports = { createPaymentUrl, vnpayReturn };
