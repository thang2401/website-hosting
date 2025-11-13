const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Cần cài đặt: npm install bcryptjs

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
    password: {
      type: String,
      select: false, // Ẩn mật khẩu theo mặc định
      required: true,
    },
    profilePic: { type: String, default: "" },

    role: { type: String, enum: ["GENERAL", "ADMIN"], default: "GENERAL" },

    otp: {
      type: String,
      select: false, // Ẩn OTP
    },
    otpExpires: {
      type: Date,
      select: false, // Ẩn thời gian hết hạn OTP
    },
    // =======================
    // TRƯỜNG 2FA ĐÃ THÊM
    // =======================
    twoFaSecret: {
      type: String,
      select: false, // Khóa bí mật 2FA (nên được bảo vệ)
    },
    isTwoFaEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Middleware Băm mật khẩu TRƯỚC khi lưu
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Phương thức so sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Lưu ý: this.password vẫn có thể truy cập được trong ngữ cảnh này
  // mặc dù đã đặt select: false
  if (!this.password) {
    // Nếu trường password không được truy vấn, cần lấy lại
    const userWithPassword = await this.model("user")
      .findOne({ _id: this._id })
      .select("+password");
    if (!userWithPassword || !userWithPassword.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, userWithPassword.password);
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
