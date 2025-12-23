const crypto = require("crypto");

// Use a strong secret in .env, e.g. CHAT_ENCRYPTION_SECRET="a-long-random-string"
const CHAT_SECRET = process.env.CHAT_ENCRYPTION_SECRET;
if (!CHAT_SECRET) {
  throw new Error(
    "CHAT_ENCRYPTION_SECRET is not set. Please add it to your environment."
  );
}

// Derive a 32-byte key from the secret
const KEY = crypto.scryptSync(CHAT_SECRET, "taskhub-chat-salt", 32);
const ALGORITHM = "aes-256-gcm";

// Encrypt plaintext -> single string "ivHex:authTagHex:cipherHex"
function encryptText(plaintext) {
  if (!plaintext || typeof plaintext !== "string") return null;

  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const ivHex = iv.toString("hex");
  const authTagHex = authTag.toString("hex");
  const cipherHex = encrypted.toString("hex");

  return `${ivHex}:${authTagHex}:${cipherHex}`;
}

// Decrypt "ivHex:authTagHex:cipherHex" -> plaintext
function decryptText(encryptedText) {
  if (!encryptedText) return null;

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encryptedText format");
  }

  const [ivHex, authTagHex, cipherHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(cipherHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encryptText,
  decryptText,
};
