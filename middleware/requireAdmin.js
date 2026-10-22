function requireAdmin(req, res, next) {
    // Vérifier si l'utilisateur est connecté en tant qu'admin
    if (req.session?.isAdmin === true) {
        return next();
    }

    // Pour les routes API, renvoyer une erreur JSON
    if (req.path.startsWith("/api/")) {
        return res.status(401).json({
            error: "Authentification requise."
        });
    }

    // Pour les pages web, rediriger vers la connexion
    return res.redirect("/admin/login");
}

module.exports = requireAdmin;