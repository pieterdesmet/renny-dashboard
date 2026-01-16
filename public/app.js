// Alleen data die 100% zeker is van de profielpagina

// Format grote nummers
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Update dashboard met data (alleen 100% zekere data)
function updateDashboard(data) {
    const stats = data.stats;
    
    // Update stat cards - alleen data die 100% zeker is van profielpagina
    document.getElementById('totalPosts').textContent = formatNumber(stats.totalPosts);
    document.getElementById('postsPerDay').textContent = stats.postsPerDay || stats.averagePostsPerDay || '-';
    document.getElementById('percentage').textContent = (stats.percentageOfAllPosts || 0) + '%';
    document.getElementById('beenThanked').textContent = formatNumber(stats.beenThanked || 0);
    document.getElementById('hasThanked').textContent = formatNumber(stats.hasThanked || 0);
    document.getElementById('daysActive').textContent = formatNumber(stats.daysSinceJoined || 0);
    
    // Update info section (alleen data die 100% zeker is)
    document.getElementById('joinedDate').textContent = stats.joinedDate || '-';
    document.getElementById('lastActive').textContent = stats.lastActive || '-';
    
    // Update last updated
    const lastUpdated = new Date(data.scrapedAt);
    document.getElementById('lastUpdated').textContent = 
        `Laatst bijgewerkt: ${lastUpdated.toLocaleString('nl-NL')}`;
}

// Fetch data van API
async function fetchData() {
    try {
        const response = await fetch('/api/renny');
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('lastUpdated').textContent = 'Error bij ophalen data';
    }
}

// Initial load
fetchData();

// Auto-refresh elke 5 minuten
setInterval(fetchData, 5 * 60 * 1000);
