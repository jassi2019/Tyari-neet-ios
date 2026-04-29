const { User, Otp } = require("../../models");
const { generateOTP, generateOTPExpirationDate } = require("../../utils/otp");
const { OTP_TYPES } = require("../../constants");
const env = require("../../config/env");
const sendSms = require("../../services/sms");

const passwordResetPhoneVerificationV1 = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const allowDevOtp = String(env.ALLOW_DEV_OTP || "").toLowerCase() === "true";
    const genericSuccessMessage = "If an account exists for this phone number, an OTP has been sent.";

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Normalize phone — ensure it starts with +
    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    // Find user by phone
    const userDoc = await User.findOne({ where: { phone: normalizedPhone } });

    // Prevent enumeration: respond generically if user not found
    if (!userDoc) {
      return res.status(200).json({ message: genericSuccessMessage, data: null });
    }

    // Delete any existing phone reset OTPs for this phone
    await Otp.destroy({
      where: { phone: normalizedPhone, type: OTP_TYPES.PHONE_PASSWORD_RESET },
    });

    const otpCode = generateOTP();

    const otpDoc = await Otp.create({
      email: userDoc.email,
      phone: normalizedPhone,
      otp: otpCode,
      expiresAt: generateOTPExpirationDate(),
      type: OTP_TYPES.PHONE_PASSWORD_RESET,
    });

    try {
      await sendSms({
        to: normalizedPhone,
        body: `Your Taiyari NEET ki password reset OTP is: ${otpCode}. Valid for 10 minutes. Do not share it with anyone.`,
      });
    } catch (smsError) {
      if (allowDevOtp) {
        return res.status(200).json({
          message: genericSuccessMessage,
          data: { otp: otpDoc.otp },
        });
      }

      await otpDoc.destroy();
      return res.status(503).json({
        message: "SMS service unavailable. Please use email to reset your password.",
      });
    }

    return res.status(200).json({ message: genericSuccessMessage, data: null });
  } catch (error) {
    next(error);
  }
};

module.exports = passwordResetPhoneVerificationV1;
