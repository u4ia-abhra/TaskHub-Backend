// services/razorpayService.js
const Razorpay = require('razorpay');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER; // RazorpayX account id (string)
const isProd = process.env.NODE_ENV === 'production';

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

// REST helper for RazorpayX endpoints (payouts/contacts/fund_accounts)
const rpAxios = axios.create({
  baseURL: 'https://api.razorpay.com/v1',
  auth: {
    username: keyId,
    password: keySecret,
  },
  timeout: 30000
});

async function createOrder({ amountRupees, currency = 'INR', receipt, notes = {} }) {
  const amountPaise = Math.round(amountRupees * 100);
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt,
    notes
  });
  return order;
}

async function fetchPayment(paymentId) {
  // GET /v1/payments/:id
  const res = await rpAxios.get(`/payments/${paymentId}`);
  return res.data;
}

// Contacts (RazorpayX)
async function createOrGetContact({ name, email, contact, type = 'employee', reference_id }) {
  const payload = { name, email, contact, type };
  if (reference_id) payload.reference_id = reference_id;

  const res = await rpAxios.post('/contacts', payload);
  return res.data;
}

async function createFundAccountForUPI({ contact_id, upi }) {
  // POST /v1/fund_accounts
  const payload = {
    contact_id,
    account_type: 'vpa',
    vpa: {
      address: upi
    }
  };
  const res = await rpAxios.post('/fund_accounts', payload);
  return res.data;
}

// Create Payout (composite API). Use idempotency key (mandatory).
async function createPayout({ amountRupees, fund_account_id, narration, reference_id }) {
  const amountPaise = Math.round(amountRupees * 100);

  const payload = {
    account_number: accountNumber, // business account identifier (RazorpayX)
    fund_account_id,
    amount: amountPaise,
    currency: 'INR',
    mode: 'UPI',
    purpose: 'payout',
    narration: narration || 'Task payout',
    reference_id: reference_id || uuidv4()
  };

  const idempotencyKey = uuidv4();
  const res = await rpAxios.post('/payouts', payload, {
    headers: {
      'Idempotency-Key': idempotencyKey
    }
  });
  return res.data;
}

module.exports = {
  razorpay,
  createOrder,
  fetchPayment,
  createOrGetContact,
  createFundAccountForUPI,
  createPayout
};
