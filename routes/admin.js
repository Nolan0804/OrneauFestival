const express = require("express");
const router = express.Router();
const pool = require("../database");
const bcrypt = require("bcrypt");
const { loginLimiter } = require("../middleware/rateLimiters");
const requireRole = require("../middleware/requireRole");

const ALLOWED_ROLES = [
    "organisateur",
    "communication",
    "collaborateur",
    "benevole"
];


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
            req.session.userName = user.name;

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

router.post("/admin/users", requireRole("organisateur"), loginLimiter, async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || typeof role !== "string" || !name.trim() || !email.trim() || !password) {
            return res.status(400).send(
                "Veuillez remplir tous les champs."
            );
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length > 150 || cleanEmail.length > 254) {
            return res.status(400).send(
                "Le nom ou l'adresse e-mail est trop long."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).send(
                "L'adresse e-mail n'est pas valide."
            );
        }

        if (password.length < 12 || password.length > 72) {
            return res.status(400).send(
                "Le mot de passe doit contenir entre 12 et 72 caractères."
            );
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).send(
                "Le rôle sélectionné n'est pas valide."
            );
        }

        const passwordHash = await bcrypt.hash(password, 14);

        const result = await pool.query(
            `INSERT INTO "user" (
                name,
                email,
                password_hash,
                role
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, email, role`,
            [cleanName, cleanEmail, passwordHash, role]
        );

        const newUser = result.rows[0];

        return res.redirect("/dashboard");

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).send(
                "Un compte existe déjà avec cette adresse e-mail."
            );
        }
        console.error("Erreur lors de la création de l'utilisateur :", error);

        return res.status(500).send(
            "Une erreur est survenue lors de la création du compte."
        );
    }}
);

module.exports = router;
