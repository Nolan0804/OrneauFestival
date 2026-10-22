const express = require("express");
const router = express.Router();

const bcrypt = require("bcrypt");
const { loginLimiter } = require("../middleware/rateLimiters");
const requireAdmin = require("../middleware/requireAdmin");

// Afficher la page de connexion
router.get("/admin/login", (req, res) => {
    if (req.session?.isAdmin === true) {
        return res.redirect("/dashboard");
    }

    res.render("login", { error: null });
});

// Traiter la connexion
router.post("/admin/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        const validUsername = username === process.env.ADMIN_USERNAME;
        const validPassword = await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );

        if (!validUsername || !validPassword) {
            return res.status(401).render("admin/login", {
                error: "Identifiants incorrects."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error(err);
                return res.status(500).render("admin/login", {
                    error: "Une erreur est survenue."
                });
            }

            req.session.isAdmin = true;
            res.redirect("dashboard");
        });
    } catch (error) {
        console.error(error);
        res.status(500).render("admin/login", {
            error: "Une erreur est survenue."
        });
    }
});

// Déconnexion
router.post("/admin/logout", requireAdmin, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);

        res.clearCookie("festival.sid");
        res.redirect("/admin/login");
    });
});

module.exports = router;