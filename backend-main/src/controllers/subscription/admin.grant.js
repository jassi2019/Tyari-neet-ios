const { Subscription, Plan, User } = require("../../models");

const adminGrantSubscriptionV1 = async (req, res, next) => {
  try {
    const { userId, planId, endDate, notes } = req.body;

    if (!userId || !planId || !endDate) {
      return res.status(400).json({ message: "userId, planId, and endDate are required" });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = await Plan.findByPk(planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const subscription = await Subscription.create({
      userId,
      planId,
      startDate: new Date(),
      endDate: new Date(endDate),
      paymentId: `admin_grant_${Date.now()}`,
      orderId: `admin_grant_${Date.now()}`,
      signature: "admin_granted",
      paymentMethod: "ADMIN_GRANT",
      amount: 0,
      paymentStatus: "SUCCESS",
      platform: "RAZORPAY",
      notes: notes || `Granted by admin on ${new Date().toISOString()}`,
    });

    return res.status(201).json({
      message: "Subscription granted successfully",
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = adminGrantSubscriptionV1;
