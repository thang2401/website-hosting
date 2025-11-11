const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String },
    profilePic: { type: String, default: "" },

    role: { type: String, enum: ["GENERAL", "ADMIN"], default: "GENERAL" },

    otp: { type: String },
    otpExpires: { type: Date },

    // ✅ BỔ SUNG: Theo dõi trạng thái đăng ký 3 bước
    // Báo hiệu: Đang trong quy trình đăng ký/chờ xác thực OTP
    otpSignUp: { type: Boolean, default: false },

    // ✅ BỔ SUNG: Báo hiệu user đã hoàn tất đăng ký (đã đặt mật khẩu)
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
