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

    // ✅ True = đã gửi OTP nhưng chưa hoàn tất đăng ký
    otpSignUp: { type: Boolean, default: false },

    // ✅ True = tài khoản đã xác minh OTP & hoàn tất mật khẩu
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
