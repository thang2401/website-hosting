const express = require("express");
const cors = require("cors");
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
// Đã sửa: Giữ lại trust proxy để fix lỗi Mixed Content
app.set("trust proxy", 1);

/* ============================================================
    1. CORS (Đã sửa để cho phép SameSite=None)
============================================================ */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://domanhhung.id.vn",
    credentials: true,
    // Thêm các headers cần thiết cho preflight requests (OPTIONS)
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

/* ============================================================
    2. Middleware bảo mật cơ bản
============================================================ */
// Giữ lại helmet, nhưng có thể cần tinh chỉnh nếu có lỗi Content-Security-Policy
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

/* ============================================================
3. Giới hạn tốc độ request chống DDoS
============================================================ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
  },
});
app.use("/api", limiter);

/* ============================================================
    3.5. WAF cơ bản (Giữ nguyên)
============================================================ */
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
      ` WAF chặn truy cập nghi ngờ từ IP ${
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
    4. Logging (Winston + Morgan) (Giữ nguyên)
============================================================ */
const logDir = path.join(__dirname, "logs");
const fs = require("fs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      (info) =>
        `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    new winston.transports.Console(),
  ],
});

app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

/* ============================================================
    5. Routes API (Giữ nguyên)
============================================================ */
app.use("/api", router);

/* ============================================================
    6. Middleware xử lý lỗi toàn cục (Giữ nguyên)
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
    7. Khởi chạy Server & Kết nối Database (Giữ nguyên)
============================================================ */
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB();
    console.log("✅ Kết nối MongoDB thành công");
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại cổng ${PORT} (HTTP)`);
    });
  } catch (error) {
    logger.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
})();
