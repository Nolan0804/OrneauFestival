const rateLimit = require("express-rate-limit");

const formulaireLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives. Réessayez dans 15 minutes."
    }
});

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives de connexion. Réessayez plus tard."
    }
});

module.exports = {formulaireLimiter, loginLimiter};
