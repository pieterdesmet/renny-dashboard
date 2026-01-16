# 📊 Renny Dashboard

Een ludiek en professioneel dashboard dat de poststatistieken van gebruiker "Renny" op het Stamnummer3 forum weergeeft.

## 🚀 Features

- **Live statistieken**: Automatisch bijgewerkte data van Renny's profiel
- **Mooie visualisaties**: Grafieken en statistiek cards
- **Responsive design**: Werkt op desktop en mobiel
- **Auto-refresh**: Data wordt elke 5 minuten automatisch bijgewerkt

## 📋 Vereisten

- Node.js (v14 of hoger)
- npm of yarn

## 🛠️ Installatie

1. Clone of download dit project
2. Installeer dependencies:
```bash
npm install
```

## ▶️ Gebruik

Start de server:
```bash
npm start
```

Of voor development met auto-reload:
```bash
npm run dev
```

Open je browser en ga naar: `http://localhost:3000`

## 📊 Weergegeven Statistieken

- **Totaal aantal berichten**: Het totale aantal posts sinds lidmaatschap
- **Berichten per dag**: Gemiddeld aantal posts per dag
- **Percentage van forum**: Welk percentage van alle forum posts van Renny zijn
- **Bedankt statistieken**: Hoe vaak bedankt en bedankt ontvangen
- **Activiteit over tijd**: Grafiek met maandelijkse activiteit

## 🏗️ Technologie

- **Backend**: Node.js + Express
- **Scraping**: Cheerio + Axios
- **Frontend**: Vanilla JavaScript + Chart.js
- **Styling**: Modern CSS met dark theme

## ⚙️ Configuratie

De server draait standaard op poort 3000. Je kunt dit aanpassen via de `PORT` environment variable:

```bash
PORT=8080 npm start
```

## 📝 Notities

- Data wordt gecached voor 5 minuten om de server niet te overbelasten
- Bij scraping errors wordt fallback data gebruikt
- Het dashboard toont publiekelijk beschikbare informatie van het forum

## 🔒 Privacy

Dit dashboard toont alleen publiekelijk beschikbare informatie van het Stamnummer3 forum. Geen persoonlijke of privé data wordt verzameld of opgeslagen.

## 📄 Licentie

MIT
