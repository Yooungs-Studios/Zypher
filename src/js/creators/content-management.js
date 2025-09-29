function editContent(contentId) {
    alert(`Editar contenido con ID: ${contentId}`);
}

function deleteContent(contentId) {
    const confirmation = confirm(`¿Seguro que quieres eliminar el contenido con ID: ${contentId}?`);
    if (confirmation) {
        alert(`Contenido ${contentId} eliminado.`);
    }
}
