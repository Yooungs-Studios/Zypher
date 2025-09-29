document.addEventListener("DOMContentLoaded", () => {
    const viewsChart = document.getElementById('views-chart');
    const trafficChart = document.getElementById('traffic-chart');

    viewsChart.innerHTML = '<p>Cargando gráfica de vistas...</p>';
    trafficChart.innerHTML = '<p>Cargando gráfica de fuentes de tráfico...</p>';

    setTimeout(() => {
        viewsChart.innerHTML = '<p>Gráfica de vistas lista.</p>';
        trafficChart.innerHTML = '<p>Gráfica de tráfico lista.</p>';
    }, 2000);
});
