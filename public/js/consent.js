// Affiche le champ e-mail uniquement si le consentement marketing est coché
const consentCheckbox = document.getElementById("marketingConsent");
const emailWrapper = document.getElementById("consent-email");
const emailInput = document.getElementById("email");

if (consentCheckbox && emailWrapper && emailInput) {
    const syncEmailField = () => {
        const accepted = consentCheckbox.checked;

        emailWrapper.hidden = !accepted;
        consentCheckbox.setAttribute("aria-expanded", String(accepted));

        // Champ obligatoire seulement si le consentement est donné,
        // et désactivé sinon pour ne pas être envoyé au serveur.
        emailInput.required = accepted;
        emailInput.disabled = !accepted;
    };

    consentCheckbox.addEventListener("change", () => {
        syncEmailField();

        if (consentCheckbox.checked) {
            emailInput.focus();
        }
    });

    // État initial (ex. retour arrière du navigateur avec la case déjà cochée)
    syncEmailField();
}
