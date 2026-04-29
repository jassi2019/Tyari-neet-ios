const { User, Otp } = require("../../models");
const { OTP_TYPES } = require("../../constants");
const { generateJWT } = require("../../utils/jwt");

const passwordResetPhoneOTPVerificationV1 = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP are required" });
    }

    const normalizedPhone = phone.startsWith("+") ? phone : `+${phone}`;

    const otpDoc = await Otp.findOne({
      where: { phone: normalizedPhone, otp, type: OTP_TYPES.PHONE_PASSWORD_RESET },
    });

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await otpDoc.destroy();

    const userDoc = await User.findOne({ where: { phone: normalizedPhone } });

    if (!userDoc) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const token = generateJWT({ userId: userDoc.id });

    return res.status(200).json({
      message: "OTP verified successfully",
      data: { token },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = passwordResetPhoneOTPVerificationV1;
