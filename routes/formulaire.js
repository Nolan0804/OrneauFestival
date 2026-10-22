const express = require("express");
const router = express.Router();

const pool = require("../database");
const { formulaireLimiter } = require("../middleware/rateLimiters");

router.post("/formulaire", formulaireLimiter, async (req, res) => {
    let client;
    let transactionStarted = false;

    try {
        const {
            age,
            transport,
            budget,
            festivalInterest,
            artist,
            email,
            marketingConsent
        } = req.body;

        // Validation des champs obligatoires
        const transportsAutorises = [
            "bus", "train", "voiture", "velo", "navette"
        ];
        const interetsAutorises = ["yes", "maybe", "no"];

        if (
            age === undefined ||
            !transportsAutorises.includes(transport) ||
            budget === undefined ||
            !interetsAutorises.includes(festivalInterest)
        ) {
            return res.status(400).send(
                "Veuillez remplir correctement tous les champs obligatoires."
            );
        }

        // Normaliser la sélection en tableau
        const artistes = Array.isArray(artist)
            ? artist
            : typeof artist === "string"
                ? [artist]
                : [];

        if (
            artistes.length < 1 ||
            artistes.length > 5 ||
            artistes.some(value =>
                typeof value !== "string" || !value.trim()
            )
        ) {
            return res.status(400).send(
                "Veuillez sélectionner entre 1 et 5 artistes."
            );
        }

        const ageNumber = Number(age);
        const budgetNumber = Number(budget);

        if (
            !Number.isInteger(ageNumber) ||
            ageNumber < 0 ||
            ageNumber > 100
        ) {
            return res.status(400).send("Âge invalide.");
        }

        if (
            !Number.isInteger(budgetNumber) ||
            budgetNumber < 0 ||
            budgetNumber > 10000
        ) {
            return res.status(400).send("Budget invalide.");
        }

        const wantsMarketing = marketingConsent === "1";

        const normalizedEmail =
            typeof email === "string" && email.trim()
                ? email.trim().toLowerCase()
                : null;

        if (wantsMarketing && !normalizedEmail) {
            return res.status(400).send(
                "Une adresse e-mail est nécessaire pour recevoir les actualités."
            );
        }

        if (normalizedEmail && normalizedEmail.length > 254) {
            return res.status(400).send("Adresse e-mail trop longue.");
        }

        // Transaction PostgreSQL
        client = await pool.connect();
        await client.query("BEGIN");
        transactionStarted = true;

        const artistesResolus = [];

        for (const valeur of artistes) {
            let artisteEnBase;

            if (valeur.startsWith("new:")) {
                const nom = valeur.slice(4).trim();

                if (!nom || nom.length > 150) {
                    await client.query("ROLLBACK");
                    transactionStarted = false;
                    return res.status(400).send("Nom d'artiste invalide.");
                }

                // Créer l'artiste s'il n'existe pas déjà
                const result = await client.query(
                    `INSERT INTO artist (name)
                     VALUES ($1)
                     ON CONFLICT (normalized_name)
                     DO UPDATE SET name = artist.name
                     RETURNING id, name`,
                    [nom]
                );

                artisteEnBase = result.rows[0];
            } else {
                // Vérifier l'identifiant d'un artiste existant
                if (!/^\d+$/.test(valeur)) {
                    await client.query("ROLLBACK");
                    transactionStarted = false;
                    return res.status(400).send(
                        "Identifiant d'artiste invalide."
                    );
                }

                const result = await client.query(
                    `SELECT id, name
                     FROM artist
                     WHERE id = $1`,
                    [valeur]
                );

                if (result.rowCount === 0) {
                    await client.query("ROLLBACK");
                    transactionStarted = false;
                    return res.status(400).send(
                        "Un artiste sélectionné est introuvable."
                    );
                }

                artisteEnBase = result.rows[0];
            }

            // Éviter les doublons dans une même réponse
            if (!artistesResolus.some(
                a => String(a.id) === String(artisteEnBase.id)
            )) {
                artistesResolus.push(artisteEnBase);
            }
        }

        // Enregistrer les réponses du questionnaire
        const result = await client.query(
            `INSERT INTO sondage (
                age,
                transport,
                budget,
                festival_interest,
                email,
                marketing_consent
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id`,
            [
                ageNumber,
                transport,
                budgetNumber,
                festivalInterest,
                normalizedEmail,
                wantsMarketing
            ]
        );

        const responseId = result.rows[0].id;

        // Relier la réponse à chaque artiste choisi
        for (const artisteEnBase of artistesResolus) {
            await client.query(
                `INSERT INTO survey_artist_votes
                    (response_id, artist_id)
                 VALUES ($1, $2)`,
                [responseId, artisteEnBase.id]
            );
        }

        await client.query("COMMIT");
        transactionStarted = false;

        console.log("Réponse enregistrée, ID :", responseId);

        return res.redirect(303, "/thanks");

    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Erreur rollback :", rollbackError.message);
            }
        }

        console.error("Erreur formulaire :", error.message);

        return res.status(500).send(
            "Une erreur est survenue lors de l'enregistrement."
        );

    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;