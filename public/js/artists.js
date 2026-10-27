const artistSelect = document.getElementById("artist");

fetch("/api/artists")
    .then(response => {
    if (!response.ok) {
    throw new Error("Impossible de charger les artistes.");
}

    return response.json();
})
    .then(artists => {
    new TomSelect("#artist", {
        valueField: "id",
        labelField: "name",
        searchField: ["name"],
        options: artists,
        items: [],
        plugins: ["remove_button"],
        create: function(input, callback) {
            const name = input.trim();

            if (!name) {
                return callback();
            }

            const existing = artists.find(
                artist =>
                    artist.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr")
            );

            if (existing) {
                return callback(existing);
            }

            callback({
                id: "new:" + name.toLowerCase(),
                name: name,
                isNew: true
            });
        },
        createOnBlur: true,
        persist: false,
        maxOptions: 1000,
        maxItems: 10,
        closeAfterSelect: true,
        hideSelected: true,
        placeholder: "Rechercher ou ajouter un artiste...",
        render: {
            option_create: function(data, escape) {
                return '<div class="create">Ajouter « ' +
                    escape(data.input) + ' »</div>';
            }
        }
    });

})
    .catch(error => {
    console.error("Erreur de chargement des artistes :", error);

    artistSelect.insertAdjacentHTML(
    "afterend",
    '<p class="artist-error">' +
    'Impossible de charger les artistes. Réessayez plus tard.' +
    '</p>'
    );
});