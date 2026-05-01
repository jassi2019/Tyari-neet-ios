const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  USER: "USER",
});

const PAYMENT_STATUSES = Object.freeze({
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
});

const SERVICE_TYPES = Object.freeze({
  PREMIUM: "PREMIUM",
  FREE: "FREE",
});

const REGISTRATION_SOURCES = Object.freeze({
  APP: "APP",
  GOOGLE: "GOOGLE",
});

const OTP_TYPES = Object.freeze({
  REGISTRATION: "REGISTRATION",
  PASSWORD_RESET: "PASSWORD_RESET",
  PHONE_PASSWORD_RESET: "PHONE_PASSWORD_RESET",
});

const PAYMENT_PLATFORMS = Object.freeze({
  RAZORPAY: "RAZORPAY",
  APPLE_IAP: "APPLE_IAP",
  STRIPE: "STRIPE",
  CASHFREE: "CASHFREE",
});

// Feature types for Home screen boxes — each maps to a content slot on Topic.
const FEATURE_TYPES = Object.freeze({
  EXPLANATION: "explanation",
  REVISION_RECALL: "revision_recall",
  HIDDEN_LINKS: "hidden_links",
  EXERCISE_REVIVAL: "exercise_revival",
  MASTER_EXEMPLAR: "master_exemplar",
  PYQ: "pyq",
  CHAPTER_CHECKPOINT: "chapter_checkpoint",
});

const FEATURE_TYPE_TO_FIELD = Object.freeze({
  [FEATURE_TYPES.EXPLANATION]: "explanationContent",
  [FEATURE_TYPES.REVISION_RECALL]: "revisionContent",
  [FEATURE_TYPES.HIDDEN_LINKS]: "hiddenLinksContent",
  [FEATURE_TYPES.EXERCISE_REVIVAL]: "exerciseRevivalContent",
  [FEATURE_TYPES.MASTER_EXEMPLAR]: "masterExemplarContent",
  [FEATURE_TYPES.PYQ]: "pyqContent",
  [FEATURE_TYPES.CHAPTER_CHECKPOINT]: "chapterCheckpointContent",
});

module.exports = {
  ROLES,
  PAYMENT_STATUSES,
  SERVICE_TYPES,
  REGISTRATION_SOURCES,
  OTP_TYPES,
  PAYMENT_PLATFORMS,
  FEATURE_TYPES,
  FEATURE_TYPE_TO_FIELD,
};
