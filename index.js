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
const paymentRouter = require("./routes/vnpay");

const app = express();
app.set("trust proxy", true);

// =======================
// 1. CORS chuẩn cho React
//chống domain khác gửi request lấy token
// =======================
const allowedOrigin = [
  "https://domanhhung.id.vn",
  "https://api.domanhhung.id.vn",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigin.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", allowedOrigin[0]);
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
// =======================
// 2. Middleware bảo mật (Tăng cường CSP)

// =======================
app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        connectSrc: [
          "'self'",
          "https://domanhhung.id.vn",
          "https://api.domanhhung.id.vn",
        ],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: true, // (Chống XSS)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://images.unsplash.com",
          "https://trusted-storage.com",
        ],
        connectSrc: ["'self'", allowedOrigin[0]],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(mongoSanitize());
app.use(xss()); //Chống XSS trong input
app.use(express.json({ limit: "10kb" })); //Chặn attacker gửi request body 5GB để làm sập server.
app.use(cookieParser());

// =======================
// 3. Rate-limit
//100 request / 15 phút
// =======================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100,
  message: {
    success: false,
    message: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
  },
});
app.use("/api", limiter);

// =======================
// 3.5 WAF cơ bản (Mở rộng)
// =======================
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

app.use((req, res, next) => {
  const suspiciousPatterns = [
    "<script>",
    "DROP TABLE",
    "UNION SELECT",
    "1=1",
    "alert(",
    "SELECT * FROM", // SQL Injection
    "sleep(",
    "file_get_contents(",
    "passwd",
    "\\.\\./",
  ];
  const bodyString = JSON.stringify(req.body || {});
  const urlString = req.originalUrl;
  const queryCheck = JSON.stringify(req.query || {});

  const isSuspicious = suspiciousPatterns.some(
    (pattern) =>
      bodyString.includes(pattern) ||
      urlString.includes(pattern) ||
      queryCheck.includes(pattern)
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

// =======================
// 4. Logging
// =======================
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// =======================
// 5. Routes
// =======================
app.use("/api", router);
app.use("/api/payment", paymentRouter);
// =======================
// 6. Xử lý lỗi toàn cục
// =======================
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.originalUrl}`);
  console.error("❌ Lỗi hệ thống:", err);
  res.status(500).json({
    success: false,
    message: "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.",
  });
});

// =======================
// 7. Kết nối DB + chạy server
// =======================
const PORT = process.env.PORT || 8080;

(async () => {
  try {
    await connectDB();
    console.log("✅ Kết nối MongoDB thành công");
    app.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại cổng ${PORT} (HTTP/HTTPS)`);
    });
  } catch (error) {
    logger.error(`❌ Lỗi kết nối MongoDB: ${error.message}`);
    process.exit(1);
  }
})();
