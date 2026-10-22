const express = require("express");
const router = express.Router();

// Page d'accueil : formulaire du sondage
router.get("/", (req, res) => {
    res.render("home");
});

// Page affichée après l'envoi du formulaire
router.get("/thanks", (req, res) => {
    res.render("thanks");
});

// Page indiquant qu'une réponse a déjà été enregistrée
router.get("/already-completed", (req, res) => {
    res.render("alreadyCompleted");
});

// Politique de confidentialité
router.get("/privacy-policy", (req, res) => {
    res.render("privacyPolicy");
});

module.exports = router;