// utils/paypal.js
const fetch = require("node-fetch");

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE;

async function getPaypalAccessToken() {
  // Mã hóa Client ID và Secret Key sang Base64
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  try {
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || "Lỗi Token");
    return data.access_token;
  } catch (error) {
    console.error("Lỗi lấy Access Token PayPal:", error.message);
    throw new Error("Không thể kết nối với PayPal hoặc xác thực thất bại.");
  }
}

module.exports = getPaypalAccessToken;
