require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

const pageRoutes = require("./routes/pages");
const adminRoutes = require("./routes/admin");
const formulaireRoutes = require("./routes/formulaire");
const dashboardRoutes = require("./routes/dashboard");
const artistsRoutes = require("./routes/artists");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        name: "festival.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 15 * 60 * 1000
        }
    })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/", pageRoutes);
app.use("/", adminRoutes);
app.use("/", formulaireRoutes);
app.use("/", dashboardRoutes);
app.use("/api", artistsRoutes);

app.use((err, req, res, next) => {
    console.error("Erreur serveur :", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).send("Une erreur interne est survenue.");
});

app.listen(5000, () => {
    console.log(`Serveur démarré sur http://localhost:5000`);
});
