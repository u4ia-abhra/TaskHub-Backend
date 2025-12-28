// services/razorpayService.js

const Razorpay = require("razorpay");
const axios = require("axios");

/* -------------------- ENV VALIDATION -------------------- */

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER; // RazorpayX account number

if (!keyId || !keySecret || !accountNumber) {
  throw new Error(
    "RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_ACCOUNT_NUMBER must be set"
  );
}

/* -------------------- CLIENTS -------------------- */

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// Axios for RazorpayX APIs (contacts, fund accounts, payouts)
const rpAxios = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  auth: {
    username: keyId,
    password: keySecret,
  },
  timeout: 30000,
});

/* -------------------- ORDERS (Payments) -------------------- */

async function createOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("INVALID_ORDER_AMOUNT_PAISE");
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes,
  });

  return order;
}

async function fetchPayment(paymentId) {
  const res = await rpAxios.get(`/payments/${paymentId}`);
  return res.data;
}

/* -------------------- RAZORPAYX: CONTACTS -------------------- */

async function createOrGetContact({
  name,
  email,
  contact,
  type = "employee",
  reference_id,
}) {
  const payload = { name, email, contact, type };
  if (reference_id) payload.reference_id = reference_id;

  const res = await rpAxios.post("/contacts", payload);
  return res.data;
}

/* -------------------- RAZORPAYX: FUND ACCOUNTS -------------------- */

async function createFundAccountForUPI({ contact_id, upi }) {
  if (!contact_id || !upi) {
    throw new Error("INVALID_FUND_ACCOUNT_INPUT");
  }

  const payload = {
    contact_id,
    account_type: "vpa",
    vpa: { address: upi },
  };

  const res = await rpAxios.post("/fund_accounts", payload);
  return res.data;
}

/* -------------------- RAZORPAYX: PAYOUTS -------------------- */
/**
 * amountPaise: integer (MANDATORY)
 * idempotencyKey: deterministic string (MANDATORY)
 */
async function createPayout({
  amountPaise,
  fund_account_id,
  narration,
  reference_id,
  idempotencyKey,
}) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("INVALID_PAYOUT_AMOUNT_PAISE");
  }

  if (!idempotencyKey) {
    throw new Error("IDEMPOTENCY_KEY_REQUIRED");
  }

  const payload = {
    account_number: accountNumber,
    fund_account_id,
    amount: amountPaise,
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    narration: narration || "Task payout",
    reference_id,
  };

  const res = await rpAxios.post("/payouts", payload, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });

  return res.data;
}

module.exports = {
  razorpay,
  createOrder,
  fetchPayment,
  createOrGetContact,
  createFundAccountForUPI,
  createPayout,
};
