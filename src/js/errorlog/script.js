const urlParams = new URLSearchParams(window.location.search);
const errorCode = urlParams.get('error');
const errorMessages = {
    'reg-urp': '¡Oh no! Parece que alguien se adelantó con ese nombre. Intenta con otro, no te preocupes, ¡aquí hay creatividad para rato!',
    'login-failed': 'Hmm... ese usuario o contraseña no parece correcto. ¿Te olvidaste de algo? ¡No te preocupes, a todos nos pasa!',
    '3': '¡Alerta! Falta un documento para continuar. No podemos dejar que te vayas sin rellenar eso.',
    '6': 'Houston, tenemos un problema. No encontramos ese usuario, ¡es como si nunca hubiera existido!',
    '5': 'Algo salió mal al iniciar sesión. ¡Probablemente los gremlins informáticos están de fiesta!',
    '7': 'Las contraseñas no coinciden. ¡Esas malvadas contraseñas nunca quieren cooperar!'
};

const errorMessageElement = document.getElementById('errorMessage');
if (errorMessageElement) {
    errorMessageElement.textContent = errorMessages[errorCode] || `Ups, parece que algo salió mal. Código de error: ${errorCode}. Intenta nuevamente.`;
} else {
    console.error('El elemento con ID "errorMessage" no existe.');
}
