// Déconnecte après une période d'inactivité. Le dashboard ne fait presque aucune
// requête : sans ce script, travailler sur la page ne prolongerait pas la session.
const LOGIN_URL = "/admin/login?expired=1";

function redirectToLogin() {
    window.location.replace(LOGIN_URL);
}

(() => {
    const TIMEOUT_MS = Number(document.body.dataset.sessionTimeout);
    const PING_INTERVAL_MS = 60 * 1000;
    const CHECK_INTERVAL_MS = 5 * 1000;
    const RECORD_INTERVAL_MS = 1000;
    const STORAGE_KEY = "festival.lastActivity";
    const ACTIVITY_EVENTS = ["pointermove", "pointerdown", "keydown", "scroll"];

    // Le chargement de la page vient de renouveler la session côté serveur.
    let lastActivity = Date.now();
    let lastPing = lastActivity;
    let isExpiring = false;

    function shareActivity(timestamp) {
        try {
            localStorage.setItem(STORAGE_KEY, String(timestamp));
        } catch {
            // Sans stockage, seul cet onglet suit l'activité.
        }
    }

    async function pingServer(now) {
        lastPing = now;

        try {
            const response = await fetch("/api/session/ping", {
                method: "POST",
                cache: "no-store"
            });

            if (response.status === 401) {
                redirectToLogin();
            }
        } catch {
            // Coupure réseau : la prochaine activité réessaiera.
        }
    }

    function pingIfDue(now) {
        if (lastActivity > lastPing && now - lastPing >= PING_INTERVAL_MS) {
            pingServer(now);
        }
    }

    // Ferme aussi la session côté serveur : le ping peut l'avoir renouvelée un peu
    // après la dernière activité, et /admin/login renverrait alors au dashboard.
    async function expireSession() {
        if (isExpiring) return;
        isExpiring = true;

        try {
            await fetch("/admin/logout", { method: "POST", redirect: "manual" });
        } finally {
            redirectToLogin();
        }
    }

    // Retourne true si le délai est dépassé, y compris au réveil de l'ordinateur,
    // où les minuteries étaient suspendues.
    function checkExpiry(now) {
        if (now - lastActivity < TIMEOUT_MS) return false;

        expireSession();
        return true;
    }

    function handleActivity() {
        const now = Date.now();

        if (checkExpiry(now) || now - lastActivity < RECORD_INTERVAL_MS) return;

        lastActivity = now;
        shareActivity(now);
        pingIfDue(now);
    }

    function tick() {
        const now = Date.now();

        if (!checkExpiry(now)) {
            pingIfDue(now);
        }
    }

    for (const eventName of ACTIVITY_EVENTS) {
        window.addEventListener(eventName, handleActivity, { passive: true, capture: true });
    }

    // Un onglet actif garde les autres onglets ouverts en vie.
    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
            lastActivity = Math.max(lastActivity, Number(event.newValue) || 0);
        }
    });

    document.addEventListener("visibilitychange", tick);
    setInterval(tick, CHECK_INTERVAL_MS);

    shareActivity(lastActivity);
})();
