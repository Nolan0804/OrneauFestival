const refreshButton = document.querySelector("#refresh-button");
const toggleArtistsButton = document.querySelector("#toggle-artists");
const artistsContent = document.querySelector("#artists-content");
const artistsList = document.querySelector("#artists-list");
const artistSearch = document.querySelector("#artist-search");

let artistsData = [];

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat("fr-BE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

// Sans réponse, le pourcentage vaut 0 plutôt que NaN ou Infinity.
function percentOf(value, total) {
    return total > 0 ? (value / total) * 100 : 0;
}

// Objectif = centaine suivante : 133 → 200, 200 → 300, etc.
function getResponseGoal(total) {
    return (Math.floor(total / 100) + 1) * 100;
}

function renderGoal(total) {
    const goal = getResponseGoal(total);
    const percent = (total / goal) * 100;
    const bar = document.getElementById("goal-bar");

    setText("goal-current", formatNumber(total));
    setText("goal-target", formatNumber(goal));
    // Arrondi vers le bas : 299/300 ne doit pas afficher 100 %.
    setText("goal-percent", `${Math.floor(percent)}%`);

    bar.setAttribute("aria-valuemax", String(goal));
    bar.setAttribute("aria-valuenow", String(total));
    document.getElementById("goal-fill").style.width = `${percent}%`;
}

function renderTransport(id, count, total) {
    const percent = percentOf(count, total);

    setText(`transport-${id}`, formatNumber(count));
    setText(`transport-${id}-pourcentage`, percent.toFixed(0));
    document.getElementById(`transport-${id}-bar`).style.width = `${percent}%`;
}

function renderMarketingContacts(contacts, total) {
    const percent = percentOf(contacts, total);

    setText("marketing-percent", formatNumber(percent, 1));
    setText(
        "marketing-count",
        `${formatNumber(contacts)} contact${contacts > 1 ? "s" : ""} sur ${formatNumber(total)} réponse${total > 1 ? "s" : ""}`
    );

    document.getElementById("marketing-bar").setAttribute("aria-valuenow", percent.toFixed(1));
    document.getElementById("marketing-fill").style.width = `${percent}%`;
}

function renderArtists() {
    const query = artistSearch.value.trim().toLocaleLowerCase("fr");
    const filtered = artistsData.filter(artist =>
        artist.name.toLocaleLowerCase("fr").includes(query)
    );

    artistsList.replaceChildren();

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = artistsData.length
            ? "Aucun artiste ne correspond à votre recherche."
            : "Aucun artiste n'a encore été renseigné.";

        artistsList.appendChild(empty);
        return;
    }

    for (const artist of filtered) {
        const row = document.createElement("div");
        row.className = "artist-row";

        const name = document.createElement("span");
        name.className = "artist-row__name";
        name.textContent = artist.name;

        const count = document.createElement("span");
        count.className = "artist-row__count";
        count.textContent =
            `${artist.count} ${artist.count > 1 ? "mentions" : "mention"}`;

        row.append(name, count);
        artistsList.appendChild(row);
    }
}

async function loadDashboard() {
    refreshButton.disabled = true;
    setText("dashboard-status", "Actualisation des statistiques...");

    try {
        const response = await fetch("/api/dashboard", {
            headers: { Accept: "application/json" },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const data = await response.json();
        setText("procent_interested", "Intéressé - " + percentOf(data.interest.yes, data.total).toFixed(2) + "%")
        setText("procent_maybe", "A convaincre - " + percentOf(data.interest.maybe, data.total).toFixed(2) + "%")
        setText("procent_no", "Pas intéressé - " + percentOf(data.interest.no, data.total).toFixed(2) + "%")
        setText("yes-count", formatNumber(data.interest.yes));
        setText("maybe-count", formatNumber(data.interest.maybe));
        setText("no-count", formatNumber(data.interest.no));
        renderGoal(data.total);
        setText("min-age", data.age.minimum === null ? "—" : formatNumber(data.age.minimum, 1));
        setText("median-age", data.age.median === null ? "—" : formatNumber(data.age.median, 1));
        setText("max-age", data.age.maximum === null ? "—" : formatNumber(data.age.maximum, 1));

        renderTransport("bus", data.transport.bus, data.total);
        renderTransport("voiture", data.transport.car, data.total);
        renderTransport("train", data.transport.train, data.total);
        renderTransport("navette", data.transport.navette, data.total);
        renderTransport("velo", data.transport.velo, data.total);

        setText("min-budget", data.budget.minimum === null ? "—" : formatNumber(data.budget.minimum, 2));
        setText("median-budget",data.budget.median === null ? "—" : formatNumber(data.budget.median, 2));
        setText("max-budget", data.budget.maximum === null ? "—" : formatNumber(data.budget.maximum, 2));

        renderMarketingContacts(data.marketingContacts, data.total);

        artistsData = data.artists || [];
        setText("artists-total",`${artistsData.length} artiste${artistsData.length > 1 ? "s" : ""} distinct${artistsData.length > 1 ? "s" : ""}`);
        renderArtists();

        setText("dashboard-status", `Données actualisées à ${new Date().toLocaleTimeString("fr-BE")}.`);
    } catch (error) {
        console.error("Erreur dashboard :", error);
        setText(
            "dashboard-status",
            "Impossible de charger les statistiques. Vérifiez votre connexion au serveur."
        );
    } finally {
        refreshButton.disabled = false;
    }
}

toggleArtistsButton.addEventListener("click", () => {
    const isExpanded =
        toggleArtistsButton.getAttribute("aria-expanded") === "true";

    toggleArtistsButton.setAttribute("aria-expanded", String(!isExpanded));
    artistsContent.hidden = isExpanded;

    toggleArtistsButton.firstChild.textContent =
        isExpanded ? "Voir la liste " : "Masquer la liste ";
});

artistSearch.addEventListener("input", renderArtists);
refreshButton.addEventListener("click", loadDashboard);

loadDashboard();
