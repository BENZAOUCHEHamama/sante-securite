const User = require("../models/User");
const Patient = require("../models/Patient");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const { encrypt, decrypt } = require("../utils/cryptSecret");

/* ===================== SIGNUP ===================== */
const signup = async (req, res) => {
  try {
    const { username, email, password, role, specialite, isChef, service, mfaEnabled } = req.body;

    // Un seul admin autorisé
    if (role === "admin") {
      const existingAdmin = await User.findOne({ role: "admin" });
      if (existingAdmin) {
        return res.status(400).json({ message: "Un administrateur existe déjà" });
      }
    }

    // Email unique
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Créer utilisateur
    const user = new User({
      username,
      email,
      password,
      role,
      mfaEnabled: mfaEnabled || false
    });

    // Médecin
    if (role === "medecin") {
      if (!specialite) {
        return res.status(400).json({ message: "Medecin doit avoir une specialite" });
      }
      user.specialite = specialite;

      if (isChef) {
        if (!service) {
          return res.status(400).json({ message: "Chef de service doit avoir un service" });
        }
        user.isChef = true;
        user.service = service;
      }
    }

    // MFA
    let mfaQR = null;
    if (mfaEnabled) {
      const secret = speakeasy.generateSecret({
        name: `TPConfidentialite (${username})`,
        issuer: "Hôpital Central"
      });

      user.mfaSecret = encrypt(secret.base32);
      user.mfaEnabled = true;
      mfaQR = await qrcode.toDataURL(secret.otpauth_url);
    }

    await user.save();

    /* 🔥 CRÉATION AUTOMATIQUE DU PATIENT */
    if (role === "patient") {
      const patient = new Patient({
        userId: user._id,
        medicalHistory: "",
        allergies: "",
        currentMedications: "",
        bloodType: "",
        assignedService: ""
      });
      await patient.save();
    }

    const response = { message: "User created successfully" };
    if (mfaQR) response.mfaQR = mfaQR;

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===================== LOGIN ===================== */
const login = async (req, res) => {
  try {
    const { email, password, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe invalide" });

    if (user.status !== "approved") {
      return res.status(403).json({ message: "Compte en attente de validation admin" });
    }

    // MFA
    if (user.mfaEnabled) {
      if (!code) {
        return res.status(200).json({
          mfaRequired: true,
          userId: user._id,
          message: "Code MFA requis"
        });
      }

      const decryptedSecret = decrypt(user.mfaSecret);
      const codeStr = String(code).trim();

      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: "base32",
        token: codeStr,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ message: "Code MFA invalide" });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===================== GENERATE MFA ===================== */
const generateMfa = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `TPConfidentialite (${user.username})`,
      issuer: "Hôpital Central"
    });

    user.mfaSecret = encrypt(secret.base32);
    user.mfaEnabled = true;
    await user.save();

    const qr = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===================== VERIFY MFA ===================== */
const verifyMfa = async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfaSecret) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const decryptedSecret = decrypt(user.mfaSecret);

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: "base32",
      token: String(token).trim(),
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid MFA token" });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login, generateMfa, verifyMfa };
