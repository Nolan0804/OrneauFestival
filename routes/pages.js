const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("home");
});

router.get("/thanks", (req, res) => {
    res.render("thanks");
});

router.get("/already-completed", (req, res) => {
    res.render("alreadyCompleted");
});

router.get("/privacy-policy", (req, res) => {
    res.render("privacyPolicy");
});

module.exports = router;