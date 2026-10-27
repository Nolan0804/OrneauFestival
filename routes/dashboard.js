
const express = require("express");
const router = express.Router();

const pool = require("../database");
const requireAdmin = require("../middleware/requireAdmin");

// Page du dashboard
router.get("/dashboard", requireAdmin, (req, res) => {
    return res.render("dashboard");
});

// API des statistiques
router.get("/api/dashboard", requireAdmin, async (req, res) => {
    try {
        const statsSql = `
            SELECT
                COUNT(*)::int AS total,

                COUNT(*) FILTER (
                    WHERE festival_interest = 'yes'
                )::int AS interested,

                COUNT(*) FILTER (
                    WHERE festival_interest = 'no'
                )::int AS not_interested,

                COUNT(*) FILTER (
                    WHERE festival_interest = 'maybe'
                )::int AS maybe,

                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age) AS median_age,
                MIN(age) AS age_minimum,
                MAX(age) AS age_maximum,

                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY budget) AS median_budget,
                MIN(budget) AS budget_minimum,
                MAX(budget) AS budget_maximum,

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
            pool.query(statsSql),

            pool.query(`
                SELECT
                    a.id,
                    a.name,
                    COUNT(sav.response_id)::int AS count
                FROM artist a
                INNER JOIN survey_artist_votes sav
                    ON sav.artist_id = a.id
                GROUP BY a.id, a.name
                ORDER BY count DESC, a.name ASC;
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
                median: stats.median_age === null ? null : Number(stats.median_age)
            },

            transport: {
                bus: stats.transport_bus,
                car: stats.transport_voiture,
                train: stats.transport_train,
                navette: stats.transport_navette,
                velo: stats.transport_velo
            },

            budget: {
                minimum: stats.budget_minimum === null ? null : Number(stats.budget_minimum),
                maximum: stats.budget_maximum === null ? null : Number(stats.budget_maximum),
                median: stats.median_budget === null ? null : Number(stats.median_budget)
            },

            artists: artistsResult.rows.map(artist => ({
                id: artist.id,
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

module.exports = router;
