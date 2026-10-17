require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

pool.query("SELECT NOW()")
    .then((result) => {
        console.log("Connexion PostgreSQL réussie !");
        console.log("Heure du serveur :", result.rows[0].now);
    })
    .catch((error) => {
        console.error("Erreur de connexion PostgreSQL :", error.message);
    });

module.exports = pool;