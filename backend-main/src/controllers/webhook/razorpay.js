const crypto = require("crypto");
const { Subscription } = require("../../models");
const { PAYMENT_STATUSES } = require("../../constants");
const env = require("../../config/env");
const { logger } = require("../../utils/logger");

const verifyWebhookSignature = (rawBody, signature) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  if (!signature || !rawBody) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};

const razorpayWebhookV1 = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn({ signature }, "Razorpay webhook signature verification failed");
      return res.status(401).json({ message: "Invalid signature" });
    }

    const { event, payload } = req.body;
    logger.info({ event }, "Razorpay webhook received");

    if (event === "payment.captured") {
      const {
        payment: {
          entity: { order_id, method },
        },
      } = payload;

      const subscription = await Subscription.findOne({
        where: { orderId: order_id },
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      subscription.paymentMethod = method;
      subscription.paymentStatus = PAYMENT_STATUSES.SUCCESS;
      await subscription.save();

      return res.status(200).json({ message: "Payment captured" });
    }

    if (event === "payment.failed") {
      const {
        payment: {
          entity: { order_id },
        },
      } = payload;

      const subscription = await Subscription.findOne({
        where: { orderId: order_id },
      });

      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      subscription.paymentStatus = PAYMENT_STATUSES.FAILED;
      await subscription.save();

      return res.status(200).json({ message: "Payment failed" });
    }

    return res.status(200).json({ message: "Event ignored", event });
  } catch (error) {
    next(error);
  }
};

module.exports = razorpayWebhookV1;
