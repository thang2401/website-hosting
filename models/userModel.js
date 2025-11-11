const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: String,
    profilePic: String,
    role: { type: String, default: "GENERAL" },
    otp: String,
    otpExpires: Date,
    otpSignUp: { type: Boolean, default: false }, // True = chưa hoàn tất signup
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
