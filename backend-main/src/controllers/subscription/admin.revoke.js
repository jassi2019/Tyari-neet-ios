const { Subscription } = require("../../models");

const adminRevokeSubscriptionV1 = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription) return res.status(404).json({ message: "Subscription not found" });

    await subscription.update({
      endDate: new Date(),
      notes: (subscription.notes || "") + " | Revoked by admin on " + new Date().toISOString(),
    });

    return res.status(200).json({
      message: "Subscription revoked successfully",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = adminRevokeSubscriptionV1;
