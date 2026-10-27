const express = require("express");
const router = express.Router();
const pool = require("../database");
const bcrypt = require("bcrypt");
const { loginLimiter } = require("../middleware/rateLimiters");
const requireRole = require("../middleware/requireRole");

router.get("/admin/login", (req, res) => {
    if (req.session?.userId && req.session?.userRole) {
        return res.redirect("/dashboard");
    }

    return res.render("login", { error: null });
});

router.post("/admin/login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    try {
        if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
            return res.status(400).render("login", {
                error: "Veuillez remplir tous les champs."
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM "user"
             WHERE LOWER(email) = LOWER($1)`,
            [username.trim()]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).render("login", {
                error: "Aucun compte ne correspond à cette adresse e-mail."
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).render("login", {
                error: "Mot de passe incorrect."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error(err);

                return res.status(500).render("login", {
                    error: "Une erreur est survenue."
                });
            }

            req.session.userId = user.id;
            req.session.userRole = user.role;

            return req.session.save((saveErr) => {
                if (saveErr) {
                    console.error(saveErr);

                    return res.status(500).render("login", {
                        error: "Une erreur est survenue."
                    });
                }

                return res.redirect("/dashboard");
            });
        });
    } catch (error) {
        console.error(error);

        return res.status(500).render("login", {
            error: "Une erreur est survenue."
        });
    }
});

// Déconnexion
router.post("/admin/logout", (req, res, next) => {
    if (!req.session) {
        return res.redirect("/");
    }

    req.session.destroy((err) => {
        if (err) return next(err);

        res.clearCookie("festival.sid");
        return res.redirect("/");
    });
});

module.exports = router;
