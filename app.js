const express = require("express");
const path = require("path");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const dotenv = require('dotenv');
dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    name: "festival.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 5 * 60 * 1000
    }
}));

const formulaireLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives. Réessayez dans 15 minutes."
    }
});

// Limitation des tentatives de connexion admin
const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 15 minutes
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        error: "Trop de tentatives de connexion. Réessayez plus tard."
    }
});


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

const pool = require("./database");

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/thanks", (req, res) => {
    res.render("thanks");
})

app.get("/already-completed", (req, res) => {
    res.render("alreadyCompleted");
})

app.get("/privacy-policy", (req, res) => {
    res.render("privacyPolicy");
})

app.get("/admin/login", (req, res) => {
    if (req.session?.isAdmin === true) {
        return res.redirect("/dashboard");
    }

    res.render("login", { error: null });
});

app.post("/admin/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !process.env.ADMIN_USERNAME ||
            !process.env.ADMIN_PASSWORD_HASH
        ) {
            return res.status(400).render("login", {
                error: "Identifiants invalides."
            });
        }

        const validUsername =
            username === process.env.ADMIN_USERNAME;

        const validPassword = await bcrypt.compare(
            password,
            process.env.ADMIN_PASSWORD_HASH
        );

        if (!validUsername || !validPassword) {
            return res.status(401).render("login", {
                error: "Identifiants incorrects."
            });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error("Erreur de session :", err);
                return res.status(500).send("Erreur de connexion.");
            }

            req.session.isAdmin = true;

            req.session.save((saveError) => {
                if (saveError) {
                    console.error("Erreur de sauvegarde :", saveError);
                    return res.status(500).send("Erreur de connexion.");
                }

                return res.redirect(303, "/dashboard");
            });
        });
    } catch (error) {
        console.error("Erreur d'authentification :", error.message);
        return res.status(500).send("Erreur de connexion.");
    }
});

app.post("/admin/logout", requireAdmin, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Erreur lors de la déconnexion.");
        }

        res.clearCookie("festival.sid", {
            httpOnly: true,
            secure: true,
            sameSite: "lax"
        });

        return res.redirect("/admin/login");
    });
});

app.post("/formulaire", formulaireLimiter, async (req, res) => {
    try {
        console.log("Données reçues :", req.body);

        const {
            age,
            transport,
            budget,
            festivalInterest,
            artist,
            email,
            marketingConsent
        } = req.body;

        const transportsAutorises = [
            "bus",
            "train",
            "voiture",
            "velo",
            "navette"
        ];

        if (age === undefined || transport === undefined || !transportsAutorises.includes(transport) || budget === undefined || !festivalInterest || !artist?.trim()) {
            return res.status(400).send(
                "Veuillez remplir tous les champs obligatoires."
            );
        }

        const ageNumber = Number(age);
        const budgetNumber = Number(budget);

        if (!Number.isInteger(ageNumber) ||ageNumber < 0 || ageNumber > 100) {
            return res.status(400).send("Âge invalide.");
        }

        if (!Number.isInteger(budgetNumber) || budgetNumber < 0 || budgetNumber > 10000) {
            return res.status(400).send("Budget invalide.");
        }

        const wantsMarketing = marketingConsent === "1";

        const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : null;

        if (wantsMarketing && !normalizedEmail) {
            return res.status(400).send(
                "Une adresse e-mail est nécessaire pour recevoir les actualités."
            );
        }

        const sql = `
            INSERT INTO sondage (
                age,
                transport, 
                budget,
                festival_interest,
                artist,
                email,
                marketing_consent
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;

        const values = [
            ageNumber,
            transport, 
            budgetNumber,
            festivalInterest,
            artist.trim(),
            normalizedEmail,
            wantsMarketing
        ];

        const result = await pool.query(sql, values);

        console.log(
            "Réponse enregistrée, ID :",
            result.rows[0].id
        );

        return res.redirect(303, "/thanks");

    } catch (err) {
        console.error("Erreur PostgreSQL :", err.message);

        if (err.code === "23505") {
            return res.redirect(303, "/already-completed");
        }

        return res.status(500).send(
            "Une erreur est survenue lors de l'enregistrement."
        );
    }
});

app.get("/dashboard", requireAdmin, (req, res) => {
    res.render("dashboard");
})

app.get("/api/dashboard", requireAdmin, async (req, res) => {
    try {
const sql = `
        SELECT
            COUNT(*)::int AS total,

            -- Intérêt pour le festival
            COUNT(*) FILTER (
                WHERE festival_interest = 'yes'
            )::int AS interested,

            COUNT(*) FILTER (
                WHERE festival_interest = 'no'
            )::int AS not_interested,

            COUNT(*) FILTER (
                WHERE festival_interest = 'maybe'
            )::int AS maybe,

            -- Âges
            ROUND(AVG(age)::numeric, 1) AS average_age,
            MIN(age) AS age_minimum,
            MAX(age) AS age_maximum,

            -- Budgets
            ROUND(AVG(budget)::numeric, 2) AS average_budget,
            MIN(budget) AS budget_minimum,
            MAX(budget) AS budget_maximum,

            -- Moyens de locomotion
            COUNT(*) FILTER (
                WHERE transport = 'bus'
            )::int AS transport_bus,

            COUNT(*) FILTER (
                WHERE transport = 'train'
            )::int AS transport_train,

            COUNT(*) FILTER (
                WHERE transport = 'voiture'
            )::int AS transport_voiture,

            COUNT(*) FILTER (
                WHERE transport = 'velo'
            )::int AS transport_velo,

            COUNT(*) FILTER (
                WHERE transport = 'navette'
            )::int AS transport_navette

            FROM sondage;
        `;

        const [statsResult, artistsResult] = await Promise.all([
            pool.query(sql),
            pool.query(`
                SELECT
                    TRIM(artist) AS name,
                    COUNT(*)::int AS count
                FROM sondage
                WHERE TRIM(artist) <> ''
                GROUP BY LOWER(TRIM(artist)), TRIM(artist)
                ORDER BY count DESC, name ASC;
            `)
        ]);

        const stats = statsResult.rows[0];

        return res.status(200).json({
            total: stats.total,
            interest: {
                yes: stats.interested,
                no: stats.not_interested,
                maybe: stats.maybe
            },

            age: {
                minimum: stats.age_minimum === null ? null : Number(stats.age_minimum),
                maximum: stats.age_maximum === null ? null : Number(stats.age_maximum),
                average: stats.average_age === null ? null : Number(stats.average_age)
            },

            transport :{
                bus : stats.transport_bus === null ? null : Number(stats.transport_bus),
                car : stats.transport_voiture === null ? null : Number(stats.transport_voiture),
                train : stats.transport_train === null ? null : Number(stats.transport_train),
                navette : stats.transport_navette === null ? null : Number(stats.transport_navette),
                velo : stats.transport_velo === null ? null : Number(stats.transport_velo)
            },

            budget: {
                minimum: stats.budget_minimum === null ? null : Number(stats.budget_minimum),
                maximum: stats.budget_maximum === null ? null : Number(stats.budget_maximum),
                average: stats.average_budget === null ? null : Number(stats.average_budget)
            }, 
            
            artists: artistsResult.rows.map(artist => ({
                name: artist.name,
                count: artist.count
            }))
        });
    } catch (error) {
        console.error("Erreur statistiques :", error.message);

        return res.status(500).json({
            error: "Impossible de charger les statistiques."
        });
    }
});


app.listen(5000, () => {
    console.log("http://localhost:5000");
});

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin === true) {
        return next();
    }

    if (req.path.startsWith("/api/")) {
        return res.status(401).json({
            error: "Authentification requise."
        });
    }

    return res.redirect("/admin/login");
}