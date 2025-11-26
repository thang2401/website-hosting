const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "thang2401204@gmail.com",
    pass: "boxh zpzy aeds ltsj",
  },
});

const sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: "thang2401204@gmail.com",
    to: email,
    subject: "Mã OTP đặt lại mật khẩu",
    text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`,
  });
};

module.exports = { sendOTP };
