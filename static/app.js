const model = document.getElementById("model");

async function loadModels() {
    if (!model) {
        alert("MODEL SELECTOR NOT FOUND");
        return;
    }

    model.innerHTML = "<option>Testing connection...</option>";

    try {
        const response = await fetch(
            "https://nexora-7e9x.onrender.com/api/models?test=" + Date.now(),
            {
                method: "GET",
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        console.log("NEXORA MODELS:", data);

        if (!Array.isArray(data.models) || data.models.length === 0) {
            throw new Error("API returned zero models");
        }

        model.innerHTML = "";

        for (const item of data.models) {
            const option = document.createElement("option");

            option.value = item.id;
            option.textContent =
                (item.provider || "Other") +
                " • " +
                (item.name || item.id);

            model.appendChild(option);
        }

        console.log(
            "NEXORA: Loaded " +
            data.models.length +
            " models"
        );

    } catch (error) {
        console.error("NEXORA MODEL ERROR:", error);

        model.innerHTML =
            "<option>ERROR: " +
            error.message +
            "</option>";

        alert(
            "Model loading failed:\n\n" +
            error.message
        );
    }
}

loadModels();
