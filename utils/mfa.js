const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

function generateMfaSecret(username) {
  return speakeasy.generateSecret({ name: `TPConfidentialite (${username})` });
}

function verifyTOTP(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1
  });
}

async function generateQRCode(otpauth_url) {
  return qrcode.toDataURL(otpauth_url);
}

module.exports = { generateMfaSecret, verifyTOTP, generateQRCode };
