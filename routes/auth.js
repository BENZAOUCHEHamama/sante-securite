const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const { signup, login, generateMfa, verifyMfa } = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);
router.post("/mfa/generate/:id", generateMfa);  // activer MFA
router.post("/mfa/verify", verifyMfa);         // vérifier MFA token

module.exports = router;