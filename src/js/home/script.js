document.addEventListener("DOMContentLoaded", () => {
    // Función para mostrar notificaciones
    function showNotification(message) {
      const notificationContainer = document.getElementById('notification-container');
      const notification = document.createElement('div');
      notification.classList.add('notification');
      notification.textContent = message;
      notificationContainer.appendChild(notification);
  
      // Eliminar la notificación después de 3 segundos
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  
    // Botón para cargar más videos
    const loadMoreBtn = document.getElementById("load-more-btn");
    const trendingVideosSection = document.querySelector(".videos");
  
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", async () => {
        try {
          const response = await fetch('/api/videos?section=trending');
          const newVideos = await response.json();
  
          newVideos.forEach(video => {
            const videoCard = document.createElement('a');
            videoCard.href = `/video/${video.video_id}`;
            videoCard.classList.add('video-card', 'random');
            videoCard.innerHTML = `
              <img src="${video.minea ? '/vid/min/' + video.minea : '/esaw/vid-user-logo-defaul/banerdf.jpg'}" alt="Video Thumbnail">
              <div class="video-info">
                <h3>${video.titulo}</h3>
                <p>${video.usernick} • ${video.vistas} views</p>
              </div>
            `;
            trendingVideosSection.appendChild(videoCard);
          });
  
          showNotification('Loaded more videos');
        } catch (error) {
          console.error('Error loading more videos:', error);
          showNotification('Error loading more videos');
        }
      });
    }
  });
  