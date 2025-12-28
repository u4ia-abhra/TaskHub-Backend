// utils/razorpayVerify.js
const crypto = require('crypto');

function verifyRazorpaySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // signature is base64 encoded HMAC; Razorpay sends base64 hex? They send hex (docs).
  // Usually header is signature (hex). Compare in timing-safe way.
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = { verifyRazorpaySignature };
