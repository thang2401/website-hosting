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
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;
