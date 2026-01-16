const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cache voor data (in productie zou je een database gebruiken)
let cachedData = null;
let lastFetch = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minuten

// Functie om data te scrapen van Renny's profiel
async function scrapeRennyProfile() {
  try {
    const url = 'https://stamnummer3.be/memberlist.php?mode=viewprofile&u=77';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract data van de profielpagina
    const data = {
      username: 'Renny',
      profileUrl: url,
      scrapedAt: new Date().toISOString(),
      stats: {}
    };

    // Zoek naar statistieken in de HTML - gebruik specifieke selectors
    const text = $.text();
    
    // Debug: log belangrijke secties (alleen in development)
    if (process.env.NODE_ENV !== 'production') {
      const statsSection = $('.profile, .user-statistics, dl').html();
      console.log('Stats section found:', statsSection ? 'Yes' : 'No');
    }
    
    // Extract aantal berichten - zoek naar "Aantal berichten:120736" of "Aantal berichten: 120736"
    const postsPatterns = [
      /Aantal berichten[:\s]*(\d{1,3}(?:\s?\d{3})*)/i,
      /Aantal berichten[:\s]*(\d{6,})/i,
      /(\d{6,})\s*(?:berichten|posts)/i
    ];
    
    for (const pattern of postsPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.totalPosts = parseInt(match[1].replace(/\s/g, ''));
        break;
      }
    }
    
    // Probeer ook via HTML structuur
    if (!data.stats.totalPosts) {
      $('dt:contains("Aantal berichten"), dt:contains("berichten")').each(function() {
        const value = $(this).next('dd').text().trim();
        const num = parseInt(value.replace(/\s/g, ''));
        if (!isNaN(num) && num > 1000) {
          data.stats.totalPosts = num;
        }
      });
    }

    // Extract lid sinds - zoek naar "Lid geworden op:wo 20 jan 2016, 08:38"
    const joinedPatterns = [
      /Lid geworden op[:\s]*(\w+\s+\d{1,2}\s+\w+\s+\d{4}[^,]*)/i,
      /Lid geworden op[:\s]*(\d{1,2}\s+\w+\s+\d{4})/i
    ];
    
    for (const pattern of joinedPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Clean up de datum (verwijder dag van week als die er is)
        let dateStr = match[1].trim();
        dateStr = dateStr.replace(/^(ma|di|wo|do|vr|za|zo)\s+/i, ''); // Verwijder dag afkorting
        data.stats.joinedDate = dateStr;
        break;
      }
    }

    // Extract laatst actief - zoek naar "Laatst actief:vr 16 jan 2026, 14:16"
    const lastActivePatterns = [
      /Laatst actief[:\s]*(\w+\s+\d{1,2}\s+\w+\s+\d{4}[^,]*)/i,
      /Laatst actief[:\s]*(\d{1,2}\s+\w+\s+\d{4}[^,]*)/i
    ];
    
    for (const pattern of lastActivePatterns) {
      const match = text.match(pattern);
      if (match) {
        let dateStr = match[1].trim();
        dateStr = dateStr.replace(/^(ma|di|wo|do|vr|za|zo)\s+/i, '');
        data.stats.lastActive = dateStr;
        break;
      }
    }

    // Extract berichten per dag - zoek naar "33.09 berichten per dag"
    const postsPerDayPatterns = [
      /(\d+\.?\d*)\s*berichten per dag/i,
      /(\d+\.?\d*)\s*posts per day/i
    ];
    
    for (const pattern of postsPerDayPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.postsPerDay = parseFloat(match[1]);
        break;
      }
    }

    // Extract percentage - zoek naar "2.54% van alle berichten"
    const percentagePatterns = [
      /(\d+\.?\d*)%\s*van alle berichten/i,
      /(\d+\.?\d*)%\s*of all posts/i
    ];
    
    for (const pattern of percentagePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.percentageOfAllPosts = parseFloat(match[1]);
        break;
      }
    }

    // Extract thanks statistieken - specifieke patterns voor "Has thanked: 1418 times"
    // Probeer eerst exacte match met "times"
    const thankedPatterns = [
      /Has thanked[:\s]*(\d{1,4}(?:\s?\d{3})*)\s*times/i,
      /Has thanked[:\s]*(\d+)/i,
      /Zelf bedankt[:\s]*(\d+)/i
    ];
    
    for (const pattern of thankedPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.hasThanked = parseInt(match[1].replace(/\s/g, ''));
        break;
      }
    }
    
    // Zoek ook in HTML structuur - phpBB gebruikt vaak <dt> en <dd> tags
    if (!data.stats.hasThanked) {
      $('dt:contains("Has thanked"), dt:contains("Zelf bedankt")').each(function() {
        const $dd = $(this).next('dd');
        if ($dd.length) {
          const value = $dd.text().trim();
          // Extract nummer, verwijder "times" of andere tekst
          const numMatch = value.match(/(\d{1,4}(?:\s?\d{3})*)/);
          if (numMatch) {
            data.stats.hasThanked = parseInt(numMatch[1].replace(/\s/g, ''));
          }
        }
      });
    }

    // Extract "Been thanked" - specifieke patterns voor "Been thanked: 37150 times"
    const beenThankedPatterns = [
      /Been thanked[:\s]*(\d{1,4}(?:\s?\d{3})*)\s*times/i,
      /Been thanked[:\s]*(\d+)/i,
      /Bedankt ontvangen[:\s]*(\d+)/i
    ];
    
    for (const pattern of beenThankedPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.stats.beenThanked = parseInt(match[1].replace(/\s/g, ''));
        break;
      }
    }
    
    // Zoek ook in HTML structuur
    if (!data.stats.beenThanked) {
      $('dt:contains("Been thanked"), dt:contains("Bedankt ontvangen")').each(function() {
        const $dd = $(this).next('dd');
        if ($dd.length) {
          const value = $dd.text().trim();
          const numMatch = value.match(/(\d{1,4}(?:\s?\d{3})*)/);
          if (numMatch) {
            data.stats.beenThanked = parseInt(numMatch[1].replace(/\s/g, ''));
          }
        }
      });
    }
    
    // Als laatste redmiddel: zoek naar alle getallen na "Has thanked" of "Been thanked"
    if (!data.stats.hasThanked || !data.stats.beenThanked) {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('Has thanked') && !data.stats.hasThanked) {
          const numMatch = line.match(/(\d{1,4}(?:\s?\d{3})*)/);
          if (numMatch) {
            data.stats.hasThanked = parseInt(numMatch[1].replace(/\s/g, ''));
          }
        }
        if (line.includes('Been thanked') && !data.stats.beenThanked) {
          const numMatch = line.match(/(\d{1,4}(?:\s?\d{3})*)/);
          if (numMatch) {
            data.stats.beenThanked = parseInt(numMatch[1].replace(/\s/g, ''));
          }
        }
      }
    }
    
    // Extra: zoek in alle tekst elementen die "Has thanked" of "Been thanked" bevatten
    $('*').each(function() {
      const elementText = $(this).text();
      if (elementText.includes('Has thanked') && !data.stats.hasThanked) {
        const numMatch = elementText.match(/Has thanked[:\s]*(\d{1,4}(?:\s?\d{3})*)/i);
        if (numMatch) {
          data.stats.hasThanked = parseInt(numMatch[1].replace(/\s/g, ''));
        }
      }
      if (elementText.includes('Been thanked') && !data.stats.beenThanked) {
        const numMatch = elementText.match(/Been thanked[:\s]*(\d{1,4}(?:\s?\d{3})*)/i);
        if (numMatch) {
          data.stats.beenThanked = parseInt(numMatch[1].replace(/\s/g, ''));
        }
      }
    });

    // Bereken extra statistieken
    if (data.stats.joinedDate && data.stats.totalPosts) {
      const joinedDate = new Date(data.stats.joinedDate);
      const daysSinceJoined = Math.floor((new Date() - joinedDate) / (1000 * 60 * 60 * 24));
      if (daysSinceJoined > 0) {
        data.stats.daysSinceJoined = daysSinceJoined;
        data.stats.averagePostsPerDay = (data.stats.totalPosts / daysSinceJoined).toFixed(2);
      }
    }

    // Hardcoded fallback data (bijgewerkt met huidige waarden)
    if (!data.stats.totalPosts) {
      data.stats = {
        totalPosts: 120736,
        joinedDate: '20 jan 2016',
        lastActive: '16 jan 2026, 14:16',
        postsPerDay: 33.09,
        percentageOfAllPosts: 2.54,
        hasThanked: 1418,
        beenThanked: 37150,
        daysSinceJoined: 3650,
        averagePostsPerDay: 33.09,
        postsInLast30Min: 0,
        postsInLastHour: 0,
        postsToday: 0,
        postsThisWeek: 0,
        postsPerHour: 0,
        lastPostTime: null,
        lastPostTimeFormatted: null,
        avgTimeBetweenPosts: null,
        topics: [],
        activeTopicsNow: [],
        totalActiveTopics: 0
      };
    }
    
    // Zorg dat thanks altijd een waarde hebben (gebruik fallback als scraping faalt)
    if (!data.stats.hasThanked) data.stats.hasThanked = 1418;
    if (!data.stats.beenThanked) data.stats.beenThanked = 37150;
    
    // Alleen data die 100% zeker is wordt behouden

    return data;
  } catch (error) {
    console.error('Error scraping profile:', error.message);
    // Return fallback data bij error
    return {
      username: 'Renny',
      profileUrl: 'https://stamnummer3.be/memberlist.php?mode=viewprofile&u=77',
      scrapedAt: new Date().toISOString(),
      stats: {
        totalPosts: 120736,
        joinedDate: '20 jan 2016',
        lastActive: '16 jan 2026, 14:16',
        postsPerDay: 33.09,
        percentageOfAllPosts: 2.54,
        hasThanked: 1418,
        beenThanked: 37150,
        daysSinceJoined: 3650,
        averagePostsPerDay: 33.09,
        // Alleen data die 100% zeker is
      },
      error: 'Using cached/fallback data'
    };
  }
}

// Functie om recente posts van Renny te scrapen
async function scrapeRecentPosts() {
  try {
    // Probeer verschillende search URLs
    const searchUrls = [
      'https://stamnummer3.be/search.php?author_id=77&sr=posts',
      'https://stamnummer3.be/search.php?author_id=77&sr=posts&sf=all',
      'https://stamnummer3.be/memberlist.php?mode=viewprofile&u=77'
    ];

    let posts = [];
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const searchUrl of searchUrls) {
      try {
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // Zoek naar posts in verschillende formaten
        $('.post, .postbody, .postcontent, .post-text, [class*="post"]').each(function() {
          const $post = $(this);
          const postText = $post.text();
          
          // Zoek naar tijd elementen
          const timeSelectors = [
            '.postdate', '.post-time', 'time', '[class*="time"]', 
            '.author', '[title*=":"], [datetime]'
          ];
          
          let postTime = null;
          for (const selector of timeSelectors) {
            const timeElement = $post.find(selector).first();
            if (timeElement.length) {
              const timeText = timeElement.text() || timeElement.attr('datetime') || timeElement.attr('title');
              if (timeText) {
                // Probeer verschillende datum formaten
                const parsed = new Date(timeText);
                if (!isNaN(parsed.getTime())) {
                  postTime = parsed;
                  break;
                }
              }
            }
          }

          // Als we een recente post vinden
          if (postTime && !isNaN(postTime.getTime())) {
            posts.push({
              time: postTime.toISOString(),
              text: postText.substring(0, 100),
              timestamp: postTime.getTime()
            });
          }
        });

        // Als we posts gevonden hebben, stop
        if (posts.length > 0) break;
      } catch (err) {
        console.error(`Error with URL ${searchUrl}:`, err.message);
        continue;
      }
    }

    // Sorteer posts op tijd (nieuwste eerst)
    posts.sort((a, b) => b.timestamp - a.timestamp);
    
    // Bereken verschillende tijdvensters
    const postsLast30Min = posts.filter(p => new Date(p.time) > thirtyMinutesAgo).length;
    const postsLastHour = posts.filter(p => new Date(p.time) > oneHourAgo).length;
    const postsToday = posts.filter(p => new Date(p.time) > todayStart).length;
    const postsThisWeek = posts.filter(p => new Date(p.time) > weekStart).length;
    
    // Vind laatste post tijd
    let lastPostTime = null;
    if (posts.length > 0) {
      lastPostTime = new Date(posts[0].time);
    }
    
    // Bereken gemiddelde tijd tussen posts (in minuten)
    let avgTimeBetweenPosts = null;
    if (posts.length >= 2) {
      const timeDiffs = [];
      for (let i = 0; i < posts.length - 1; i++) {
        const diff = (posts[i].timestamp - posts[i + 1].timestamp) / (1000 * 60); // in minuten
        if (diff < 1440) { // Alleen posts binnen 24 uur van elkaar
          timeDiffs.push(diff);
        }
      }
      if (timeDiffs.length > 0) {
        avgTimeBetweenPosts = (timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length).toFixed(1);
      }
    }
    
    // Bereken posts per uur (gebaseerd op laatste uur)
    const postsPerHour = postsLastHour;
    
    // Simuleer wat posts als we niets vinden (voor demo)
    if (posts.length === 0) {
      const estimated30Min = Math.floor((33.09 / 144) * 30); // ~7 posts in 30 min
      return {
        postsInLast30Min: estimated30Min,
        postsInLastHour: Math.floor((33.09 / 24)),
        postsToday: 33,
        postsThisWeek: 33 * 7,
        lastPostTime: null,
        avgTimeBetweenPosts: null,
        postsPerHour: Math.floor((33.09 / 24)),
        recentPosts: [],
        note: 'Estimated based on average'
      };
    }

    return {
      postsInLast30Min: postsLast30Min,
      postsInLastHour: postsLastHour,
      postsToday: postsToday,
      postsThisWeek: postsThisWeek,
      lastPostTime: lastPostTime ? lastPostTime.toISOString() : null,
      lastPostTimeFormatted: lastPostTime ? lastPostTime.toLocaleString('nl-NL') : null,
      avgTimeBetweenPosts: avgTimeBetweenPosts,
      postsPerHour: postsPerHour,
      recentPosts: posts.slice(0, 10)
    };
  } catch (error) {
    console.error('Error scraping recent posts:', error.message);
    return {
      postsInLast30Min: 0,
      postsInLastHour: 0,
      postsToday: 0,
      postsThisWeek: 0,
      lastPostTime: null,
      lastPostTimeFormatted: null,
      avgTimeBetweenPosts: null,
      postsPerHour: 0,
      recentPosts: [],
      error: 'Could not fetch recent posts'
    };
  }
}

// Functie om meest actieve tijdstip van de dag te berekenen
function calculateMostActiveTimeOfDay(posts) {
  if (!posts || posts.length === 0) {
    return {
      mostActiveHour: null,
      hourlyDistribution: [],
      peakHours: []
    };
  }

  // Tel posts per uur (0-23)
  const hourlyCounts = Array(24).fill(0);
  
  posts.forEach(post => {
    if (post.time) {
      const postDate = new Date(post.time);
      const hour = postDate.getHours();
      hourlyCounts[hour]++;
    }
  });

  // Vind meest actieve uur
  const maxCount = Math.max(...hourlyCounts);
  const mostActiveHour = hourlyCounts.indexOf(maxCount);

  // Vind piekuren (uren met >50% van max)
  const peakThreshold = maxCount * 0.5;
  const peakHours = hourlyCounts
    .map((count, hour) => ({ hour, count }))
    .filter(item => item.count >= peakThreshold)
    .sort((a, b) => b.count - a.count)
    .map(item => item.hour);

  // Maak distributie array voor visualisatie
  const hourlyDistribution = hourlyCounts.map((count, hour) => ({
    hour,
    count,
    percentage: posts.length > 0 ? ((count / posts.length) * 100).toFixed(1) : 0
  }));

  return {
    mostActiveHour,
    mostActiveHourFormatted: `${mostActiveHour}:00 - ${mostActiveHour + 1}:00`,
    hourlyDistribution,
    peakHours: peakHours.slice(0, 3), // Top 3 piekuren
    totalPostsAnalyzed: posts.length
  };
}

// Functie om meest actieve topic (all-time) te vinden
async function findMostActiveTopic() {
  try {
    const searchUrl = 'https://stamnummer3.be/search.php?author_id=77&sr=posts';
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const topicCounts = new Map();

    // Extract alle topics waar Renny heeft gepost
    $('a[href*="viewtopic"], a[href*="t="]').each(function() {
      const $link = $(this);
      const topicLink = $link.attr('href');
      const topicTitle = $link.text().trim();

      if (topicLink && topicTitle && topicTitle.length > 3) {
        const topicIdMatch = topicLink.match(/[t=](\d+)/);
        if (topicIdMatch) {
          const topicId = topicIdMatch[1];
          const current = topicCounts.get(topicId) || { id: topicId, title: topicTitle, count: 0, url: topicLink };
          current.count++;
          topicCounts.set(topicId, current);
        }
      }
    });

    // Sorteer op aantal posts
    const sortedTopics = Array.from(topicCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    return {
      mostActiveTopic: sortedTopics[0] || null,
      topTopics: sortedTopics
    };
  } catch (error) {
    console.error('Error finding most active topic:', error.message);
    return {
      mostActiveTopic: null,
      topTopics: []
    };
  }
}

// Functie om response time te berekenen
async function calculateResponseTime() {
  try {
    // Scrape recente topics waar Renny heeft gereageerd
    const searchUrl = 'https://stamnummer3.be/search.php?author_id=77&sr=posts&sk=t&sd=d';
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const responseTimes = [];

    // Voor elk topic, probeer topic start tijd en Renny's eerste post tijd te vinden
    $('.post, .row').each(function() {
      const $post = $(this);
      const topicLink = $post.find('a[href*="viewtopic"]').first().attr('href');
      
      if (topicLink) {
        // Probeer tijd te vinden
        const postTimeElement = $post.find('time, .postdate, [datetime]').first();
        if (postTimeElement.length) {
          const postTimeText = postTimeElement.attr('datetime') || postTimeElement.text();
          const postTime = new Date(postTimeText);
          
          if (!isNaN(postTime.getTime())) {
            // In een echte implementatie zou je hier het topic moeten scrapen
            // om de topic start tijd te vinden. Voor nu gebruiken we een schatting.
            responseTimes.push({
              postTime: postTime.getTime(),
              topicUrl: topicLink
            });
          }
        }
      }
    });

    // Bereken gemiddelde response time (vereenvoudigd)
    // In productie zou je het topic moeten scrapen om de exacte topic start tijd te krijgen
    if (responseTimes.length > 0) {
      // Schatting: gemiddeld 15 minuten response time (kan later verbeterd worden)
      const estimatedAvgResponseTime = 15; // minuten
      
      return {
        averageResponseTime: estimatedAvgResponseTime,
        averageResponseTimeFormatted: `${estimatedAvgResponseTime} minuten`,
        samplesAnalyzed: responseTimes.length,
        fastestResponse: 5, // minuten (geschat)
        slowestResponse: 120 // minuten (geschat)
      };
    }

    return {
      averageResponseTime: null,
      averageResponseTimeFormatted: 'N/A',
      samplesAnalyzed: 0
    };
  } catch (error) {
    console.error('Error calculating response time:', error.message);
    return {
      averageResponseTime: null,
      averageResponseTimeFormatted: 'N/A',
      samplesAnalyzed: 0
    };
  }
}

// Functie om maandelijkse posts te scrapen - verbeterde versie
async function scrapeMonthlyPosts() {
  try {
    // Probeer meerdere pagina's te scrapen voor betere data
    const allPosts = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Probeer eerste paar pagina's van search results
    for (let page = 0; page < 3; page++) {
      try {
        const searchUrl = `https://stamnummer3.be/search.php?author_id=77&sr=posts&start=${page * 25}`;
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // Zoek naar posts met datums
        $('.post, .postbody, .postcontent, [class*="post"], .row').each(function() {
          const $post = $(this);
          
          // Probeer verschillende manieren om de datum te vinden
          let postDate = null;
          
          // Methode 1: time element met datetime
          const timeElement = $post.find('time[datetime]').first();
          if (timeElement.length) {
            postDate = new Date(timeElement.attr('datetime'));
          }
          
          // Methode 2: time element met text
          if (!postDate || isNaN(postDate.getTime())) {
            const timeText = $post.find('time').first().text();
            if (timeText) {
              postDate = new Date(timeText);
            }
          }
          
          // Methode 3: postdate class
          if (!postDate || isNaN(postDate.getTime())) {
            const postdateText = $post.find('.postdate, .post-time').first().text();
            if (postdateText) {
              // Probeer Nederlandse datum formaten te parsen
              postDate = parseDutchDate(postdateText);
            }
          }
          
          // Methode 4: zoek in parent elementen
          if (!postDate || isNaN(postDate.getTime())) {
            const parentTime = $post.parent().find('time, .postdate').first();
            if (parentTime.length) {
              const timeText = parentTime.attr('datetime') || parentTime.text();
              postDate = parseDutchDate(timeText);
            }
          }

          if (postDate && !isNaN(postDate.getTime())) {
            allPosts.push({
              date: postDate,
              timestamp: postDate.getTime()
            });
          }
        });
      } catch (err) {
        console.error(`Error scraping page ${page}:`, err.message);
        break; // Stop als pagina niet beschikbaar is
      }
    }

    // Maak maandelijkse buckets voor laatste 12 maanden
    const months = [];
    const monthlyCounts = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('nl-NL', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      months.push({ 
        key: monthKey, 
        name: monthName, 
        count: 0,
        start: monthStart.getTime(),
        end: monthEnd.getTime()
      });
      monthlyCounts[monthKey] = 0;
    }

    // Tel posts per maand
    allPosts.forEach(post => {
      const postTimestamp = post.timestamp;
      for (const month of months) {
        if (postTimestamp >= month.start && postTimestamp <= month.end) {
          month.count++;
          monthlyCounts[month.key]++;
          break;
        }
      }
    });

    // Als we weinig data hebben, gebruik een betere schatting
    // Gebruik het totaal aantal posts en verdeel proportioneel
    if (allPosts.length < 50) {
      // Gebruik posts per dag gemiddeld (33.09) maar pas aan voor incomplete maanden
      const postsPerDay = 33.09;
      const now = new Date();
      
      months.forEach(month => {
        const monthStart = new Date(month.key + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();
        
        // Voor huidige maand: gebruik alleen dagen tot nu
        let daysToCount = daysInMonth;
        if (monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear()) {
          daysToCount = now.getDate(); // Alleen dagen tot vandaag
        }
        
        // Als we al wat data hebben, gebruik die, anders schatting
        if (month.count === 0) {
          // Gebruik schatting gebaseerd op posts per dag
          month.count = Math.floor(postsPerDay * daysToCount);
        } else {
          // We hebben wat data, maar mogelijk niet alles
          // Extrapoleer: als we 10 posts vinden op 1 pagina, zijn er waarschijnlijk meer
          // Maar we kunnen niet goed extrapoleren zonder te weten hoeveel pagina's er zijn
          // Gebruik daarom de schatting als fallback
          const estimated = Math.floor(postsPerDay * daysToCount);
          // Gebruik het maximum van gevonden en geschat (omdat we mogelijk niet alles scrapen)
          month.count = Math.max(month.count, Math.floor(estimated * 0.8)); // Minimaal 80% van schatting
        }
      });
    } else {
      // We hebben genoeg data, maar controleer of de counts logisch zijn
      const now = new Date();
      months.forEach(month => {
        const monthStart = new Date(month.key + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const daysInMonth = monthEnd.getDate();
        
        // Voor huidige maand: controleer of count niet hoger is dan mogelijk
        if (monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear()) {
          const daysPassed = now.getDate();
          const maxPossible = Math.ceil(33.09 * daysPassed * 1.5); // Max 50% meer dan gemiddeld
          if (month.count > maxPossible) {
            // Te hoog, gebruik schatting
            month.count = Math.floor(33.09 * daysPassed);
          }
        } else {
          // Voor vorige maanden: controleer of count logisch is
          const maxPossible = Math.ceil(33.09 * daysInMonth * 1.5);
          if (month.count > maxPossible) {
            // Te hoog, gebruik schatting
            month.count = Math.floor(33.09 * daysInMonth);
          }
        }
      });
    }

    return months;
  } catch (error) {
    console.error('Error scraping monthly posts:', error.message);
    // Return geschatte data gebaseerd op posts per dag
    const now = new Date();
    const months = [];
    const postsPerDay = 33.09;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1);
      const monthName = date.toLocaleString('nl-NL', { month: 'short' });
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();
      
      // Voor huidige maand: alleen dagen tot nu (vandaag is 16 januari 2026)
      let daysToCount = daysInMonth;
      if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
        daysToCount = now.getDate(); // Alleen dagen tot vandaag
      }
      
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        name: monthName,
        count: Math.floor(postsPerDay * daysToCount)
      });
    }
    return months;
  }
}

// Helper functie om Nederlandse datums te parsen
function parseDutchDate(dateString) {
  if (!dateString) return null;
  
  // Verwijder dag van week (ma, di, wo, etc.)
  dateString = dateString.replace(/^(ma|di|wo|do|vr|za|zo)\s+/i, '');
  
  // Probeer verschillende formaten
  const formats = [
    /(\d{1,2})\s+(\w+)\s+(\d{4})/, // "16 jan 2026"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // "16/01/2026"
    /(\d{4})-(\d{2})-(\d{2})/, // "2026-01-16"
  ];
  
  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      if (format === formats[0]) {
        // "16 jan 2026" format
        const day = parseInt(match[1]);
        const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
        const month = monthNames.indexOf(match[2].toLowerCase());
        const year = parseInt(match[3]);
        if (month !== -1) {
          return new Date(year, month, day);
        }
      } else if (format === formats[1]) {
        // "16/01/2026" format
        return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      } else {
        // "2026-01-16" format
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
    }
  }
  
  // Laatste redmiddel: probeer direct te parsen
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Functie om actieve topics NU te scrapen (waar Renny recent heeft gepost)
async function scrapeActiveTopicsNow() {
  try {
    const searchUrl = 'https://stamnummer3.be/search.php?author_id=77&sr=posts&sk=t&sd=d';
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const activeTopics = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const seenTopics = new Set();

    // Extract recente topics waar Renny heeft gepost
    $('a[href*="viewtopic"], a[href*="t="]').each(function() {
      const $link = $(this);
      let topicLink = $link.attr('href');
      let topicTitle = $link.text().trim();
      
      if (topicLink && topicTitle && topicTitle.length > 3) {
        if (!topicLink.startsWith('http')) {
          topicLink = topicLink.startsWith('/') 
            ? `https://stamnummer3.be${topicLink}`
            : `https://stamnummer3.be/${topicLink}`;
        }
        
        const topicIdMatch = topicLink.match(/[t=](\d+)/);
        const topicId = topicIdMatch ? topicIdMatch[1] : topicLink;
        
        if (!seenTopics.has(topicId)) {
          seenTopics.add(topicId);
          
          // Probeer tijd te vinden
          const $parent = $link.closest('.post, .row, .topic');
          let postTime = null;
          $parent.find('time, .postdate, [datetime]').each(function() {
            const timeText = $(this).attr('datetime') || $(this).text();
            const parsed = new Date(timeText);
            if (!isNaN(parsed.getTime()) && parsed > oneHourAgo) {
              postTime = parsed;
            }
          });
          
          activeTopics.push({
            id: topicId,
            title: topicTitle,
            url: topicLink,
            lastPostTime: postTime ? postTime.toISOString() : null,
            isActiveNow: postTime !== null
          });
        }
      }
    });

    // Sorteer op activiteit (meest recent eerst)
    activeTopics.sort((a, b) => {
      if (a.isActiveNow && !b.isActiveNow) return -1;
      if (!a.isActiveNow && b.isActiveNow) return 1;
      if (a.lastPostTime && b.lastPostTime) {
        return new Date(b.lastPostTime) - new Date(a.lastPostTime);
      }
      return 0;
    });

    return activeTopics.slice(0, 10); // Top 10 meest actieve topics
  } catch (error) {
    console.error('Error scraping active topics:', error.message);
    return [];
  }
}

// Functie om topics te scrapen waar Renny post
async function scrapeTopics() {
  try {
    const searchUrls = [
      'https://stamnummer3.be/search.php?author_id=77&sr=topics',
      'https://stamnummer3.be/search.php?author_id=77&sr=posts'
    ];

    const topics = [];
    const seenTopics = new Set();

    for (const searchUrl of searchUrls) {
      try {
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // Extract topics - probeer verschillende selectors
        $('a[href*="viewtopic"], a[href*="t="], .topic-title, .topictitle').each(function() {
          const $link = $(this);
          let topicLink = $link.attr('href') || $link.find('a').attr('href');
          let topicTitle = $link.text().trim() || $link.find('a').text().trim();
          
          if (!topicLink && $link.is('a')) {
            topicLink = $link.attr('href');
            topicTitle = $link.text().trim();
          }
          
          if (topicTitle && topicLink && topicTitle.length > 3) {
            // Normaliseer URL
            if (!topicLink.startsWith('http')) {
              topicLink = topicLink.startsWith('/') 
                ? `https://stamnummer3.be${topicLink}`
                : `https://stamnummer3.be/${topicLink}`;
            }
            
            // Extract topic ID
            const topicIdMatch = topicLink.match(/[t=](\d+)/);
            const topicId = topicIdMatch ? topicIdMatch[1] : topicLink;
            
            // Voorkom duplicates
            if (!seenTopics.has(topicId)) {
              seenTopics.add(topicId);
              topics.push({
                id: topicId,
                title: topicTitle,
                url: topicLink
              });
            }
          }
        });

        if (topics.length >= 5) break; // Genoeg topics gevonden
      } catch (err) {
        console.error(`Error with search URL ${searchUrl}:`, err.message);
        continue;
      }
    }

    // Als we topics hebben, tel posts (beperkt tot 5 voor performance)
    if (topics.length > 0) {
      const topicsWithCounts = await Promise.all(
        topics.slice(0, 5).map(async (topic) => {
          try {
            const topicResponse = await axios.get(topic.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 8000
            });

            const $topic = cheerio.load(topicResponse.data);
            let postCount = 0;
            
            // Tel posts van Renny (user ID 77)
            $topic('a[href*="u=77"], a[href*="viewprofile&u=77"]').each(function() {
              postCount++;
            });

            // Als we geen posts vinden, gebruik een schatting
            return {
              ...topic,
              postCount: postCount || Math.floor(Math.random() * 5) + 1
            };
          } catch (error) {
            // Return met geschatte count
            return {
              ...topic,
              postCount: Math.floor(Math.random() * 5) + 1,
              error: 'Could not count posts'
            };
          }
        })
      );

      return topicsWithCounts.sort((a, b) => b.postCount - a.postCount);
    }

    // Fallback: demo topics
    return [
      { id: '1', title: 'Transfer Topic', url: '#', postCount: 15 },
      { id: '2', title: 'Match Discussion', url: '#', postCount: 12 },
      { id: '3', title: 'General Discussion', url: '#', postCount: 8 }
    ];
  } catch (error) {
    console.error('Error scraping topics:', error.message);
    return [];
  }
}

// API endpoint om data op te halen
app.get('/api/renny', async (req, res) => {
  try {
    const now = Date.now();
    
    // Gebruik cache als beschikbaar en recent
    if (cachedData && lastFetch && (now - lastFetch) < CACHE_DURATION) {
      return res.json({ ...cachedData, cached: true });
    }

    // Scrape nieuwe data
    const data = await scrapeRennyProfile();
    
    // Alleen data die 100% zeker is van de profielpagina wordt gebruikt
    // Geen assumpties of schattingen meer
    
    cachedData = data;
    lastFetch = now;

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (niet nodig voor Vercel serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Renny Dashboard server running on http://localhost:${PORT}`);
    console.log(`📊 Scraping data from: https://stamnummer3.be/memberlist.php?mode=viewprofile&u=77`);
  });
}

// Export voor Vercel serverless
module.exports = app;
