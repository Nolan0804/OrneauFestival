const express = require("express");
const router = express.Router();

const pool = require("../database");
const requireAdmin = require("../middleware/requireAdmin");

// GET /api/artists
// Récupère la liste des artistes pour Tom Select.
router.get("/artists", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name
            FROM artist
            ORDER BY name ASC
        `);

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error(
            "Erreur lors du chargement des artistes :",
            error.message
        );

        return res.status(500).json({
            error: "Impossible de récupérer les artistes."
        });
    }
});

router.get("/artists", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name
            FROM artist
            ORDER BY name ASC
        `);

        return res.json(result.rows);
    } catch (error) {
        console.error("Erreur GET /api/artists :", error.message);

        return res.status(500).json({
            error: "Impossible de récupérer les artistes."
        });
    }
});

router.post("/artists", requireAdmin, async (req, res) => {
    try {
        const { name } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                error: "Le nom de l'artiste est obligatoire."
            });
        }

        const cleanName = name.trim();

        if (cleanName.length > 150) {
            return res.status(400).json({
                error: "Le nom ne peut pas dépasser 150 caractères."
            });
        }

        const result = await pool.query(
            `INSERT INTO artist (name)
             VALUES ($1)
             ON CONFLICT (normalized_name)
             DO UPDATE SET name = artist.name
             RETURNING id, name`,
            [cleanName]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Erreur POST /api/artists :", error.message);

        return res.status(500).json({
            error: "Impossible d'ajouter cet artiste."
        });
    }
});

module.exports = router;