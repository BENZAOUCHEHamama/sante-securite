module.exports = {
    MONGO_URI: "mongodb://127.0.0.1:27017/sante-securite",
    JWT_SECRET: "mon_secret_jwt",
    PORT: 5000,
    // Clé de chiffrement pour les secrets MFA (doit être une chaîne hex de 64 caractères)
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", // 64 caractères hex = 32 bytes
};