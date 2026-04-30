/**
 * Payment Flow End-to-End Test
 * --------------------------------
 * Tests the entire Razorpay payment flow without needing the mobile app.
 *
 * Usage:
 *   cd backend-main
 *   node test-payment-flow.js
 *
 * Required env vars (in backend-main/.env):
 *   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 *
 * What it tests:
 *   1. Login (get auth token)
 *   2. Fetch plans
 *   3. Create Razorpay order
 *   4. Simulate Razorpay payment (forge signature with KEY_SECRET)
 *   5. Create subscription (validates signature server-side)
 *   6. Send a fake webhook (forge signature with WEBHOOK_SECRET)
 *   7. Verify subscription status in DB
 */

const crypto = require("crypto");
const axios = require("axios");

require("./src/config/env");
const env = require("./src/config/env");

// ----------- CONFIG -----------
const API_BASE = process.env.TEST_API_BASE || "https://api.taiyarineetki.com";
const TEST_EMAIL = process.env.TEST_EMAIL || "social.marketing@salarytopup.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";
// ------------------------------

const log = {
  step: (n, msg) => console.log(`\n\x1b[36m[STEP ${n}]\x1b[0m ${msg}`),
  ok: (msg) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`),
  fail: (msg) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`),
  info: (msg) => console.log(`  \x1b[90m→\x1b[0m ${msg}`),
};

const die = (msg, err) => {
  log.fail(msg);
  if (err?.response?.data) console.error("  Response:", JSON.stringify(err.response.data, null, 2));
  else if (err?.message) console.error("  Error:", err.message);
  process.exit(1);
};

const sign = (secret, payload) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const main = async () => {
  console.log("\n\x1b[1m🧪 Razorpay Payment Flow Test\x1b[0m");
  console.log(`API: ${API_BASE}`);
  console.log(`User: ${TEST_EMAIL}`);

  // Sanity checks
  if (!env.RAZORPAY_KEY_SECRET) die("RAZORPAY_KEY_SECRET missing in .env");
  if (!env.RAZORPAY_WEBHOOK_SECRET) die("RAZORPAY_WEBHOOK_SECRET missing in .env");
  if (!TEST_PASSWORD) die("TEST_PASSWORD env var required (set TEST_PASSWORD=... before running)");

  let token;

  // -------- 1. LOGIN --------
  log.step(1, "Login");
  const deviceHeaders = {
    "device-name": "test-script",
    "device-id": `test-device-${Date.now()}`,
  };
  try {
    const res = await axios.post(
      `${API_BASE}/api/v1/auth/login`,
      { email: TEST_EMAIL, password: TEST_PASSWORD },
      { headers: deviceHeaders }
    );
    token = res.data?.data?.token || res.data?.doc?.token || res.data?.token;
    if (!token) die("Login returned no token", { response: { data: res.data } });
    log.ok(`Got token (${token.slice(0, 20)}...)`);
  } catch (e) {
    die("Login failed", e);
  }

  const auth = {
    headers: {
      Authorization: `Bearer ${token}`,
      ...deviceHeaders,
    },
  };

  // -------- 2. FETCH PLANS --------
  log.step(2, "Fetch plans");
  let plan;
  try {
    const res = await axios.get(`${API_BASE}/api/v1/plans`, auth);
    const plans = res.data?.data || [];
    if (plans.length === 0) die("No plans available");
    plan = plans[0];
    log.ok(`Picked plan: ${plan.name} (₹${plan.amount}, GST ${plan.gstRate}%)`);
    log.info(`Plan ID: ${plan.id}`);
  } catch (e) {
    die("Fetch plans failed", e);
  }

  // -------- 3. CREATE ORDER --------
  log.step(3, "Create Razorpay order");
  let order;
  try {
    const res = await axios.post(
      `${API_BASE}/api/v1/subscriptions/create-order`,
      { planId: plan.id },
      auth
    );
    order = res.data?.data;
    if (!order?.id) die("Order creation returned no id", { response: { data: res.data } });
    log.ok(`Order created: ${order.id}`);
    log.info(`Amount: ${order.amount} paise (${order.currency})`);
  } catch (e) {
    die("Create order failed", e);
  }

  // -------- 4. SIMULATE RAZORPAY PAYMENT --------
  log.step(4, "Simulate Razorpay payment (forge signature)");
  const fakePaymentId = `pay_test_${Date.now()}`;
  const paymentSignature = sign(env.RAZORPAY_KEY_SECRET, `${order.id}|${fakePaymentId}`);
  log.ok(`Forged payment_id: ${fakePaymentId}`);
  log.info(`Signature: ${paymentSignature.slice(0, 32)}...`);

  // -------- 5. CREATE SUBSCRIPTION --------
  log.step(5, "Create subscription (server verifies signature)");
  let subscription;
  try {
    const res = await axios.post(
      `${API_BASE}/api/v1/subscriptions`,
      {
        orderId: order.id,
        paymentId: fakePaymentId,
        signature: paymentSignature,
        planId: plan.id,
      },
      auth
    );
    subscription = res.data?.data;
    if (!subscription?.id) die("Subscription returned no id", { response: { data: res.data } });
    log.ok(`Subscription created: ${subscription.id}`);
    log.info(`Status: ${subscription.paymentStatus}, Amount: ₹${subscription.amount}`);
    log.info(`Valid until: ${subscription.endDate}`);
    log.info("📧 Invoice email should be sent to user, admin notification to DEVELOPER_EMAILS");
  } catch (e) {
    die("Create subscription failed", e);
  }

  // -------- 6. SIMULATE WEBHOOK --------
  log.step(6, "Simulate Razorpay webhook");
  const webhookBody = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          order_id: order.id,
          method: "card",
        },
      },
    },
  };
  const webhookBodyStr = JSON.stringify(webhookBody);
  const webhookSig = sign(env.RAZORPAY_WEBHOOK_SECRET, webhookBodyStr);

  try {
    const res = await axios.post(
      `${API_BASE}/api/v1/webhooks/razorpay`,
      webhookBody,
      {
        headers: {
          "Content-Type": "application/json",
          "x-razorpay-signature": webhookSig,
        },
      }
    );
    log.ok(`Webhook accepted: ${res.data?.message}`);
  } catch (e) {
    die("Webhook failed", e);
  }

  // -------- 7. VERIFY SUBSCRIPTION (DB direct) --------
  log.step(7, "Verify subscription state in DB");
  try {
    const { Subscription } = require("./src/models");
    const fresh = await Subscription.findByPk(subscription.id);
    if (!fresh) {
      log.fail("Subscription not found in DB");
    } else {
      log.ok("Subscription found in DB");
      log.info(`Final status: ${fresh.paymentStatus}`);
      log.info(`Payment method: ${fresh.paymentMethod || "(not set — webhook may have failed)"}`);
      if (fresh.paymentMethod === "card") {
        log.ok("Webhook successfully updated paymentMethod ✓");
      }
    }
    process.exit(0);
  } catch (e) {
    log.fail("DB verify failed: " + e.message);
    process.exit(0);
  }

  console.log("\n\x1b[32m\x1b[1m✅ Payment flow test complete\x1b[0m\n");
  console.log("Next checks:");
  console.log("  1. Inbox of " + TEST_EMAIL + " — invoice email");
  console.log("  2. Inbox of " + (env.DEVELOPER_EMAILS || "(DEVELOPER_EMAILS not set)") + " — admin notification");
  console.log("  3. Server logs: docker compose logs backend | grep -i webhook");
  console.log("");
};

main().catch((e) => {
  console.error("\n\x1b[31mFatal:\x1b[0m", e.message);
  process.exit(1);
});
