const moment = require("moment");
const qs = require("querystring");
const crypto = require("crypto");

/**
 * @desc Tạo URL thanh toán VNPAY
 * @route POST /api/payment/create_payment_url
 */
const createPaymentUrl = async (req, res) => {
  try {
    // 1. Lấy dữ liệu đầu vào và kiểm tra tính hợp lệ
    const { amount, bankCode, orderInfo } = req.body;

    // Ngăn chặn amount rỗng/NaN gây lỗi 03
    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) < 1) {
      return res
        .status(400)
        .json({ message: "Số tiền thanh toán không hợp lệ hoặc bị thiếu." });
    }

    // 2. Khai báo các biến cấu hình từ .env
    const vnp_TmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    // DEBUG: Kiểm tra các biến môi trường bắt buộc (lỗi 03 nếu rỗng)
    if (!vnp_TmnCode || !secretKey || !vnpUrl || !returnUrl) {
      console.error(
        "VNPAY CONFIG ERROR: Thiếu một trong các biến môi trường bắt buộc."
      );
      return res
        .status(500)
        .json({ message: "Lỗi cấu hình thanh toán VNPay trên server." });
    }

    // 3. Chuẩn bị dữ liệu thanh toán
    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = "DH_" + Date.now();

    // Xử lý IP Address:
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
      // Đã encodeURIComponent để đảm bảo không có ký tự đặc biệt gây lỗi 03
      vnp_OrderInfo: encodeURIComponent(orderInfo || "Thanh toan donhang"),
      vnp_OrderType: "other",
      // Đã chuẩn hóa số tiền (nhân 100) và đảm bảo là số nguyên
      vnp_Amount: parseInt(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

    // 5. Sắp xếp Params (KHẮC PHỤC TRIỆT ĐỂ LỖI [object Object] VÀ LỖI 03)
    const sortedKeys = Object.keys(vnp_Params).sort();

    // TẠO ĐỐI TƯỢNG MỚI ĐÃ SẮP XẾP VỚI GIÁ TRỊ LÀ CHUỖI
    const sortedParams = {};
    for (const key of sortedKeys) {
      let value = vnp_Params[key];
      // Đảm bảo giá trị tồn tại và là chuỗi trước khi đưa vào qs.stringify
      if (value !== null && typeof value !== "undefined") {
        sortedParams[key] = String(value);
      }
    }

    // 6. Tạo chuỗi dữ liệu ký và chữ ký (Secure Hash)
    const signData = qs.stringify(sortedParams, { encode: true });

    // 💡 CÔNG CỤ DEBUG CHỦ CHỐT 💡
    console.log("=================================================");
    console.log("DEBUG: CHUỖI DỮ LIỆU KÝ (SIGN DATA):");
    console.log(signData); // Phải kiểm tra log này, đảm bảo không có [object Object] và tham số rỗng
    console.log("=================================================");

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
 */
const vnpayReturn = async (req, res) => {
  try {
    const vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const secretKey = process.env.VNP_HASH_SECRET;

    // 1. Sắp xếp Params
    // Sử dụng cú pháp reduce an toàn hơn, chuyển về chuỗi
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = String(vnp_Params[key]);
        return obj;
      }, {});

    // 2. Tạo chữ ký để so sánh
    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // 3. So sánh chữ ký
    if (secureHash === signed) {
      const vnp_ResponseCode = vnp_Params["vnp_ResponseCode"];

      // ... (Xử lý database tại đây) ...

      const frontendSuccessUrl =
        process.env.FRONTEND_SUCCESS_URL ||
        "https://domanhhung.id.vn/payment-success";
      const frontendFailedUrl =
        process.env.FRONTEND_FAILED_URL ||
        "https://domanhhung.id.vn/payment-failed";

      if (vnp_ResponseCode === "00") {
        return res.redirect(
          `${frontendSuccessUrl}?orderId=${vnp_Params["vnp_TxnRef"]}&amount=${
            vnp_Params["vnp_Amount"] / 100
          }`
        );
      } else {
        // Có thể thêm vnp_ResponseCode vào URL để debug
        return res.redirect(`${frontendFailedUrl}?message=${vnp_ResponseCode}`);
      }
    } else {
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
