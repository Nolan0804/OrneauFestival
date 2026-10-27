function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const role = req.session?.userRole;
        const userId = req.session?.userId;

        if (!userId || !role) {
            if (req.path.startsWith("/api/")) {
                return res.status(401).json({
                    error: "Authentification requise."
                });
            }

            return res.redirect("/admin/login");
        }

        if (allowedRoles.includes("all")) {
            return next();
        }

        if (!allowedRoles.includes(role)) {
            if (req.path.startsWith("/api/")) {
                return res.status(403).json({
                    error: "Accès interdit."
                });
            }

            return res.status(403).send("Accès interdit.");
        }

        return next();
    };
}

module.exports = requireRole;
