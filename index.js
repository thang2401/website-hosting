const express = require("express");
const cors = require("cors"); // <-- ĐÃ KHÔI PHỤC MODULE CẦN THIẾT
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const morgan = require("morgan");
const winston = require("winston");
const path = require("path");
const useragent = require("useragent");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");

const app = express();

// Giữ trust proxy để fix lỗi Mixed Content và đảm bảo Railway hoạt động
app.set("trust proxy", 1);

/* ============================================================
    1. CORS (Sử dụng lại module 'cors' chuẩn)
============================================================ */
// Dùng lại module 'cors' để tránh lỗi Bad Gateway
app.use(
  cors({
    origin: ["https://domanhhung.id.vn", "https://www.domanhhung.id.vn"], // Thêm cả www nếu cần
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* ============================================================
    2. Middleware bảo mật cơ bản
============================================================ */
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

/* ============================================================
    3. Giới hạn tốc độ request chống DDoS
============================================================ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  message: {
    success: false,
    message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
  },
});
app.use("/api", limiter);

/* ============================================================
    4. WAF cơ bản (Giữ nguyên)
============================================================ */
const logger = winston.createLogger({
  // ... logger config (Giữ nguyên)
});

// Kiểm tra các pattern nghi ngờ tấn công
app.use((req, res, next) => {
  const suspiciousPatterns = [
    "<script>",
    "DROP TABLE",
    "UNION SELECT",
    "1=1",
    "alert(",
  ];
  const bodyString = JSON.stringify(req.body || {});
  const urlString = req.originalUrl;

  const isSuspicious = suspiciousPatterns.some(
    (pattern) => bodyString.includes(pattern) || urlString.includes(pattern)
  );

  if (isSuspicious) {
    const agent = useragent.parse(req.headers["user-agent"]);
    logger.warn(
      `WAF chặn truy cập nghi ngờ từ IP ${
        req.ip
      }, Trình duyệt: ${agent.toString()}, URL: ${req.originalUrl}`
    );
    return res.status(403).json({
      success: false,
      message: "Yêu cầu của bạn bị hệ thống chặn do nghi ngờ tấn công.",
    });
  }
  next();
});

/* ============================================================
    5. Logging (Morgan) (Giữ nguyên)
============================================================ */
const logDir = path.join(__dirname, "logs");
const fs = require("fs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

/* ============================================================
    6. Routes API (Giữ nguyên)
============================================================ */
app.use("/api", router);

/* ============================================================
    7. Middleware xử lý lỗi toàn cục (Giữ nguyên)
============================================================ */
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.originalUrl}`);
  console.error("❌ Lỗi hệ thống:", err);
  res.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
  });
});

/* ============================================================
    8. Khởi chạy Server & Kết nối Database (Giữ nguyên)
============================================================ */
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB();
    console.log("✅ Kết nối MongoDB thành công");
    app.listen(PORT, () => {
      // Đã xóa (HTTP) vì giờ đây nó chạy sau HTTPS proxy của Railway
      console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
    });
  } catch (error) {
    logger.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
})();
