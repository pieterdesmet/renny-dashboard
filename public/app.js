let activityChart = null;
let hourlyChart = null;

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
    
    // Update nieuwe statistieken
    updateMostActiveTimeOfDay(stats.mostActiveTimeOfDay);
    updateMostActiveTopic(stats.mostActiveTopic, stats.topTopics);
    updateResponseTime(stats.responseTime);
}

// Update meest actieve tijdstip
function updateMostActiveTimeOfDay(data) {
    if (!data || !data.mostActiveHour) {
        document.getElementById('mostActiveHour').textContent = 'N/A';
        document.getElementById('peakHours').textContent = 'N/A';
        return;
    }

    document.getElementById('mostActiveHour').textContent = data.mostActiveHourFormatted || `${data.mostActiveHour}:00 - ${data.mostActiveHour + 1}:00`;
    
    if (data.peakHours && data.peakHours.length > 0) {
        const peakHoursStr = data.peakHours.map(h => `${h}:00`).join(', ');
        document.getElementById('peakHours').textContent = peakHoursStr;
    } else {
        document.getElementById('peakHours').textContent = 'N/A';
    }

    // Update hourly chart
    if (data.hourlyDistribution && data.hourlyDistribution.length > 0) {
        updateHourlyChart(data.hourlyDistribution);
    }
}

// Update hourly chart
function updateHourlyChart(hourlyData) {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;

    if (hourlyChart) {
        hourlyChart.destroy();
    }

    hourlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyData.map(d => `${d.hour}:00`),
            datasets: [{
                label: 'Posts per uur',
                data: hourlyData.map(d => d.count),
                backgroundColor: 'rgba(96, 165, 250, 0.6)',
                borderColor: '#60a5fa',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cbd5e1',
                        maxRotation: 45,
                        minRotation: 45
                    },
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    }
                },
                y: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: 'rgba(51, 65, 85, 0.3)'
                    }
                }
            }
        }
    });
}

// Update meest actieve topic
function updateMostActiveTopic(mostActiveTopic, topTopics) {
    const topicInfo = document.getElementById('mostActiveTopicInfo');
    const topTopicsList = document.getElementById('topTopicsList');

    if (!mostActiveTopic && (!topTopics || topTopics.length === 0)) {
        topicInfo.innerHTML = '<div class="loading-topics">Geen data beschikbaar</div>';
        topTopicsList.innerHTML = '<div class="loading-topics">Geen data beschikbaar</div>';
        return;
    }

    if (mostActiveTopic) {
        topicInfo.innerHTML = `
            <div class="topic-info-card-content">
                <a href="${mostActiveTopic.url || '#'}" target="_blank" class="topic-title-large">
                    ${mostActiveTopic.title || 'Onbekend topic'}
                </a>
                <div class="topic-stats">
                    <span class="topic-stat-badge">${formatNumber(mostActiveTopic.count)} posts</span>
                </div>
            </div>
        `;
    } else {
        topicInfo.innerHTML = '<div class="loading-topics">Geen data beschikbaar</div>';
    }

    if (topTopics && topTopics.length > 0) {
        topTopicsList.innerHTML = topTopics.map((topic, index) => `
            <div class="top-topic-item">
                <span class="top-topic-rank">#${index + 1}</span>
                <a href="${topic.url || '#'}" target="_blank" class="top-topic-title">
                    ${topic.title || 'Onbekend topic'}
                </a>
                <span class="top-topic-count">${formatNumber(topic.count)} posts</span>
            </div>
        `).join('');
    } else {
        topTopicsList.innerHTML = '<div class="loading-topics">Geen data beschikbaar</div>';
    }
}

// Update response time
function updateResponseTime(responseTime) {
    if (!responseTime) {
        document.getElementById('avgResponseTime').textContent = 'N/A';
        document.getElementById('fastestResponse').textContent = 'N/A';
        document.getElementById('responseSamples').textContent = '0';
        return;
    }

    document.getElementById('avgResponseTime').textContent = responseTime.averageResponseTimeFormatted || 'N/A';
    document.getElementById('fastestResponse').textContent = responseTime.fastestResponse ? `${responseTime.fastestResponse} minuten` : 'N/A';
    document.getElementById('responseSamples').textContent = responseTime.samplesAnalyzed || 0;
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
    
    // Gebruik echte maandelijkse data
    let months = [];
    let monthlyPosts = [];
    
    if (stats.monthlyPosts && stats.monthlyPosts.length > 0) {
        // Gebruik echte data
        months = stats.monthlyPosts.map(m => m.name);
        monthlyPosts = stats.monthlyPosts.map(m => m.count);
    } else {
        // Fallback: genereer data tot en met januari
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentYear, currentMonth - i, 1);
            months.push(date.toLocaleString('nl-NL', { month: 'short' }));
            
            // Schatting gebaseerd op posts per dag
            const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            const base = stats.postsPerDay || stats.averagePostsPerDay || 33.09;
            monthlyPosts.push(Math.floor(base * daysInMonth));
        }
    }
    
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
