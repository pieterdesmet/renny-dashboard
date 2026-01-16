let activityChart = null;

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

// Format datum
function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString;
}

// Update dashboard met data
function updateDashboard(data) {
    const stats = data.stats;
    
    // Update stat cards
    document.getElementById('totalPosts').textContent = formatNumber(stats.totalPosts);
    document.getElementById('postsPerDay').textContent = stats.postsPerDay || stats.averagePostsPerDay || '-';
    document.getElementById('percentage').textContent = (stats.percentageOfAllPosts || 0) + '%';
    document.getElementById('beenThanked').textContent = formatNumber(stats.beenThanked || 0);
    document.getElementById('hasThanked').textContent = formatNumber(stats.hasThanked || 0);
    document.getElementById('daysActive').textContent = formatNumber(stats.daysSinceJoined || 0);
    
    // Update nieuwe statistieken
    document.getElementById('postsIn30Min').textContent = stats.postsInLast30Min || 0;
    document.getElementById('postsToday').textContent = stats.postsToday || 0;
    document.getElementById('postsPerHour').textContent = stats.postsPerHour || 0;
    document.getElementById('activeTopics').textContent = stats.totalActiveTopics || 0;
    
    // Update speed stats
    document.getElementById('speed30Min').textContent = stats.postsInLast30Min || 0;
    document.getElementById('speedLastHour').textContent = stats.postsInLastHour || 0;
    document.getElementById('speedToday').textContent = stats.postsToday || 0;
    document.getElementById('speedThisWeek').textContent = formatNumber(stats.postsThisWeek || 0);
    
    // Update gemiddelde tijd tussen posts
    if (stats.avgTimeBetweenPosts) {
      const avgTime = parseFloat(stats.avgTimeBetweenPosts);
      if (avgTime < 60) {
        document.getElementById('avgTimeBetween').textContent = avgTime.toFixed(1) + ' min';
      } else {
        document.getElementById('avgTimeBetween').textContent = (avgTime / 60).toFixed(1) + ' uur';
      }
    } else {
      document.getElementById('avgTimeBetween').textContent = '-';
    }
    
    // Update laatste post tijd
    if (stats.lastPostTimeFormatted) {
      document.getElementById('lastPostTime').textContent = stats.lastPostTimeFormatted;
    } else if (stats.lastPostTime) {
      const lastPost = new Date(stats.lastPostTime);
      document.getElementById('lastPostTime').textContent = lastPost.toLocaleString('nl-NL');
    } else {
      document.getElementById('lastPostTime').textContent = 'Onbekend';
    }
    
    // Update info section
    document.getElementById('joinedDate').textContent = stats.joinedDate || '-';
    document.getElementById('lastActive').textContent = stats.lastActive || '-';
    
    // Update last updated
    const lastUpdated = new Date(data.scrapedAt);
    document.getElementById('lastUpdated').textContent = 
        `Laatst bijgewerkt: ${lastUpdated.toLocaleString('nl-NL')}`;
    
    // Update chart
    updateChart(stats);
    
    // Update topics list
    updateTopicsList(stats.topics || []);
    
    // Update actieve topics NU
    updateActiveTopicsNow(stats.activeTopicsNow || []);
}

// Update actieve topics NU list
function updateActiveTopicsNow(topics) {
    const topicsList = document.getElementById('activeTopicsNowList');
    
    if (!topics || topics.length === 0) {
        topicsList.innerHTML = '<div class="loading-topics">Geen actieve topics gevonden op dit moment...</div>';
        return;
    }
    
    topicsList.innerHTML = topics.map(topic => {
        const title = topic.title || 'Onbekend topic';
        const url = topic.url || '#';
        const lastPostTime = topic.lastPostTime ? new Date(topic.lastPostTime).toLocaleString('nl-NL') : 'Onbekend';
        const isActive = topic.isActiveNow ? '🔥' : '';
        
        return `
            <div class="topic-item ${topic.isActiveNow ? 'active-now' : ''}">
                <div class="topic-info">
                    <a href="${url}" target="_blank" class="topic-title" title="${title}">
                        ${isActive} ${title.length > 50 ? title.substring(0, 50) + '...' : title}
                    </a>
                    <div class="topic-meta">Laatste post: ${lastPostTime}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Update chart
function updateChart(stats) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    if (activityChart) {
        activityChart.destroy();
    }
    
    // Simuleer maandelijkse data (in productie zou je historische data hebben)
    const months = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
    const monthlyPosts = months.map(() => {
        // Simuleer variatie rond het gemiddelde
        const base = stats.postsPerDay || stats.averagePostsPerDay || 30;
        return Math.floor(base * 30 * (0.8 + Math.random() * 0.4));
    });
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Berichten per maand',
                data: monthlyPosts,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#60a5fa',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    }
                },
                y: {
                    ticks: {
                        color: '#cbd5e1',
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    },
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    }
                }
            }
        }
    });
}

// Update topics list
function updateTopicsList(topics) {
    const topicsList = document.getElementById('topicsList');
    
    if (!topics || topics.length === 0) {
        topicsList.innerHTML = '<div class="loading-topics">Geen topics gevonden of data wordt nog geladen...</div>';
        return;
    }
    
    topicsList.innerHTML = topics.map(topic => {
        const title = topic.title || 'Onbekend topic';
        const count = topic.postCount || 0;
        const url = topic.url || '#';
        
        return `
            <div class="topic-item">
                <a href="${url}" target="_blank" class="topic-title" title="${title}">
                    ${title.length > 60 ? title.substring(0, 60) + '...' : title}
                </a>
                <span class="topic-count">${count} posts</span>
            </div>
        `;
    }).join('');
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
