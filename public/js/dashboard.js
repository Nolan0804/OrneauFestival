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
        setText("procent_interested", "Intéressé - " + ((data.interest.yes / data.total) * 100).toFixed(2) + "%")
        setText("procent_maybe", "A convaincre - " + ((data.interest.maybe / data.total) * 100).toFixed(2) + "%")
        setText("procent_no", "Pas intéressé - " + ((data.interest.no / data.total) * 100).toFixed(2) + "%")
        setText("yes-count", formatNumber(data.interest.yes));
        setText("maybe-count", formatNumber(data.interest.maybe));
        setText("no-count", formatNumber(data.interest.no));
        setText("response-count", `${formatNumber(data.total)} réponse${data.total > 1 ? "s" : ""}`);
        setText("min-age", data.age.minimum === null ? "—" : formatNumber(data.age.minimum, 1));
        setText("median-age", data.age.median === null ? "—" : formatNumber(data.age.median, 1));
        setText("max-age", data.age.maximum === null ? "—" : formatNumber(data.age.maximum, 1));

        setText("transport-bus", data.transport.bus === null ? "—" : formatNumber(data.transport.bus));
        setText("transport-voiture", data.transport.car === null ? "—" : formatNumber(data.transport.car));
        setText("transport-train", data.transport.train === null ? "—" : formatNumber(data.transport.train));
        setText("transport-navette", data.transport.navette === null ? "—" : formatNumber(data.transport.navette));
        setText("transport-velo", data.transport.velo === null ? "—" : formatNumber(data.transport.velo));

        setText("transport-bus-pourcentage", data.transport.bus === null ? "—" : (formatNumber(data.transport.bus) / data.total * 100).toFixed(0));
        setText("transport-voiture-pourcentage", data.transport.car === null ? "—" : (formatNumber(data.transport.car) / data.total * 100).toFixed(0));
        setText("transport-train-pourcentage", data.transport.train === null ? "—" : (formatNumber(data.transport.train) / data.total * 100).toFixed(0));
        setText("transport-navette-pourcentage", data.transport.navette === null ? "—" : (formatNumber(data.transport.navette) / data.total * 100).toFixed(0));
        setText("transport-velo-pourcentage", data.transport.velo === null ? "—" : (formatNumber(data.transport.velo) / data.total * 100).toFixed(0));

        setText("min-budget", data.budget.minimum === null ? "—" : formatNumber(data.budget.minimum, 2));
        setText("median-budget",data.budget.median === null ? "—" : formatNumber(data.budget.median, 2));
        setText("max-budget", data.budget.maximum === null ? "—" : formatNumber(data.budget.maximum, 2));

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
