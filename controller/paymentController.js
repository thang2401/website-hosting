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

    // 1. Khai báo các biến cấu hình từ .env
    const vnp_TmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    // 2. Chuẩn bị dữ liệu thanh toán
    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = "DH_" + Date.now(); // Mã đơn hàng duy nhất

    // Lấy IP, ưu tiên IPv4 nếu là localhost
    let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    if (ipAddr && ipAddr.includes("::ffff:")) {
      ipAddr = ipAddr.split("::ffff:")[1];
    }
    // Nếu vẫn là ::1, dùng 127.0.0.1
    if (ipAddr === "::1") {
      ipAddr = "127.0.0.1";
    }

    // 3. Khởi tạo Params
    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      // Đảm bảo mã hóa URL cho vnp_OrderInfo
      vnp_OrderInfo: encodeURIComponent(orderInfo || "Thanh toan donhang"),
      vnp_OrderType: "other",
      // Đảm bảo là số nguyên trước khi nhân 100
      vnp_Amount: parseInt(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

    // 4. Sắp xếp Params
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => ((obj[key] = vnp_Params[key]), obj), {});

    // 5. Tạo chữ ký (Secure Hash)
    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    sortedParams["vnp_SecureHash"] = signed;

    // 6. Tạo URL thanh toán
    const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, {
      encode: true,
    })}`;

    // console.log("Generated VNPay URL:", paymentUrl); // Nên log để debug

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

      // Xử lý đơn hàng tại đây: Cập nhật trạng thái đơn hàng trong Database
      // Mã 00: Thanh toán thành công

      if (vnp_ResponseCode === "00") {
        // THÀNH CÔNG: Chuyển hướng về trang Success
        const successUrl =
          process.env.FRONTEND_SUCCESS_URL ||
          "https://domanhhung.id.vn/payment-success";
        return res.redirect(
          `${successUrl}?orderId=${vnp_Params["vnp_TxnRef"]}&amount=${
            vnp_Params["vnp_Amount"] / 100
          }`
        );
      } else {
        // THẤT BẠI: Chuyển hướng về trang Failed
        const failedUrl =
          process.env.FRONTEND_FAILED_URL ||
          "https://domanhhung.id.vn/payment-failed";
        return res.redirect(`${failedUrl}?message=${vnp_ResponseCode}`);
      }
    } else {
      // Chữ ký không hợp lệ
      console.error("Invalid signature:", secureHash);
      const failedUrl =
        process.env.FRONTEND_FAILED_URL ||
        "https://domanhhung.id.vn/payment-failed";
      return res.redirect(`${failedUrl}?message=INVALID_SIGNATURE`);
    }
  } catch (err) {
    console.error("Lỗi xử lý VNPay return:", err);
    res.status(500).send("Lỗi xử lý VNPay return");
  }
};

module.exports = { createPaymentUrl, vnpayReturn };
