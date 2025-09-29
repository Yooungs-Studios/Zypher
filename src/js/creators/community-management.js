function filterComments() {
    const filterValue = document.getElementById('filter-input').value.toLowerCase();
    const comments = document.querySelectorAll('#comments-list li');
    comments.forEach(comment => {
        const text = comment.textContent.toLowerCase();
        comment.style.display = text.includes(filterValue) ? 'block' : 'none';
    });
}

function replyComment(commentId) {
    alert(`Responder comentario con ID: ${commentId}`);
}

function deleteComment(commentId) {
    const confirmation = confirm(`¿Seguro que quieres eliminar el comentario con ID: ${commentId}?`);
    if (confirmation) {
        alert(`Comentario ${commentId} eliminado.`);
    }
}

function replyMessage(messageId) {
    alert(`Responder mensaje con ID: ${messageId}`);
}
