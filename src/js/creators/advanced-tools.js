function openVideoEditor() {
    alert("Editor de video abierto.");
}

function showSEOTips() {
    const seoSuggestions = [
        "Usa palabras clave relevantes.",
        "Optimiza títulos y descripciones.",
        "Agrega etiquetas adecuadas."
    ];
    document.getElementById('seo-suggestions').innerHTML = seoSuggestions.join("<br>");
}

function generateDescription() {
    const input = document.getElementById('description-input').value;
    document.getElementById('generated-description').innerHTML = `Descripción generada: ${input}`;
}

function openResource(type) {
    alert(`Abriendo recurso de tipo: ${type}`);
}
