// // notifications.js

// const notificationContainer = document.getElementById("notification-container");

// /**
//  * Show a notification.
//  * @param {string} message - The message to display.
//  * @param {string} type - The type of notification ('info', 'success', 'error').
//  * @param {number|null} duration - Duration in milliseconds; if null, notification stays until closed.
//  * @param {boolean} isClosable - Whether the notification can be closed manually.
//  */
// function showNotification(message, type = "info", duration = 3000, isClosable = false) {
//   const notification = document.createElement("div");
//   notification.classList.add("notification", type);

//   notification.innerHTML = `
//     <span>${message}</span>
//     ${isClosable ? '<button class="close-btn">&times;</button>' : ""}
//   `;

//   notificationContainer.appendChild(notification);

//   // Add close functionality if closable
//   if (isClosable) {
//     notification.querySelector(".close-btn").addEventListener("click", () => {
//       closeNotification(notification);
//     });
//   }

//   // Auto-close if duration is provided and not closable
//   if (duration && !isClosable) {
//     setTimeout(() => {
//       closeNotification(notification);
//     }, duration);
//   }
// }

// /**
//  * Close a notification with a slide-out animation.
//  * @param {HTMLElement} notification - The notification element to close.
//  */
// function closeNotification(notification) {
//   notification.style.animation = "slideOut 0.5s forwards";
//   notification.addEventListener("animationend", () => {
//     notification.remove();
//   });
// }

// // Example usage
// document.addEventListener("DOMContentLoaded", () => {
//   showNotification("¡Operación exitosa!", "success", 3000);
//   showNotification("Error al cargar datos.", "error", 3000);
//   showNotification("Esto es una notificación permanente.", "info", null, true);
// });
// notifications.js

/**
 * Show a notification and save it in the database.
 * @param {string} message - The message to display.
 * @param {string} type - The type of notification ('info', 'success', 'error').
 * @param {number|null} duration - Duration in milliseconds; if null, notification stays until closed.
 * @param {boolean} isClosable - Whether the notification can be closed manually.
 */
export async function showNotification(message, type, duration, isClosable) {
  const notificationContainer = document.getElementById("notification-container");

  if (!notificationContainer) {
      console.error("Notification container not found in the document.");
      return;
  }

  // Save notification in the database
  try {
      await saveNotificationToDb({ message, type, duration, isClosable });
  } catch (error) {
      console.error("Failed to save notification to the database:", error);
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.classList.add("notification", type);

  notification.innerHTML = `
      <span>${message}</span>
      ${isClosable ? '<button class="close-btn">&times;</button>' : ""}
  `;

  notificationContainer.appendChild(notification);

  // Add close functionality if closable
  if (isClosable) {
      notification.querySelector(".close-btn").addEventListener("click", () => {
          closeNotification(notification);
      });
  }

  // Auto-close if duration is provided and not closable
  if (duration && !isClosable) {
      setTimeout(() => {
          closeNotification(notification);
      }, duration);
  }
}

/**
* Save a notification to the database.
* @param {Object} notificationData - The notification data.
*/
async function saveNotificationToDb(notificationData) {
  const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationData),
  });

  if (!response.ok) {
      throw new Error("Failed to save notification to the database.");
  }

  const data = await response.json();
  return data;
}

/**
* Close a notification with a slide-out animation.
* @param {HTMLElement} notification - The notification element to close.
*/
function closeNotification(notification) {
  notification.style.animation = "slideOut 0.5s forwards";
  notification.addEventListener("animationend", () => {
      notification.remove();
  });
}
