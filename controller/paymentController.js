const moment = require("moment");
const qs = require("querystring");
const crypto = require("crypto");

const createPaymentUrl = async (req, res) => {
  try {
    const { amount, bankCode, orderInfo } = req.body;

    const date = new Date();
    const createDate = moment(date).format("YYYYMMDDHHmmss");
    const orderId = "DH_" + Date.now(); // mã đơn hàng duy nhất

    const vnp_TmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    const ipAddr =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    const vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: orderId,
      vnp_OrderInfo: encodeURIComponent(orderInfo || "Thanh toan don hang"),
      vnp_OrderType: "other",
      vnp_Amount: amount * 100, // nhân 100 theo yêu cầu VNPay
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) vnp_Params["vnp_BankCode"] = bankCode;

    // Sắp xếp params
    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => ((obj[key] = vnp_Params[key]), obj), {});

    // Tạo chữ ký
    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    sortedParams["vnp_SecureHash"] = signed;

    const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, {
      encode: true,
    })}`;

    res.json({ paymentUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server khi tạo URL VNPay" });
  }
};

const vnpayReturn = async (req, res) => {
  try {
    const vnp_Params = req.query;
    const secureHash = vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    const secretKey = process.env.VNP_HASH_SECRET;

    const sortedParams = Object.keys(vnp_Params)
      .sort()
      .reduce((obj, key) => ((obj[key] = vnp_Params[key]), obj), {});

    const signData = qs.stringify(sortedParams, { encode: true });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const redirectUrl =
        vnp_Params["vnp_ResponseCode"] === "00"
          ? "https://domanhhung.id.vn/payment-success"
          : "https://domanhhung.id.vn/payment-failed";
      return res.redirect(redirectUrl);
    } else {
      return res.status(400).send("Invalid signature");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi xử lý VNPay return");
  }
};

module.exports = { createPaymentUrl, vnpayReturn };
