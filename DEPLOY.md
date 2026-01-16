# 🚀 Deployment Guide

Er zijn verschillende gratis opties om dit dashboard tijdelijk te hosten. Hier zijn de eenvoudigste methodes:

## Optie 1: Railway (Aanbevolen - Meest Eenvoudig) ⭐

Railway is perfect voor Node.js apps en zeer eenvoudig te gebruiken.

### Stappen:

1. **Ga naar [railway.app](https://railway.app)** en maak een gratis account (met GitHub)

2. **Klik op "New Project"** → **"Deploy from GitHub repo"**

3. **Als je nog geen GitHub repo hebt:**
   ```bash
   cd /Users/pieterdesmet/renny-dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   # Maak een nieuwe repo op GitHub en push:
   git remote add origin <jouw-github-repo-url>
   git push -u origin main
   ```

4. **In Railway:**
   - Selecteer je GitHub repository
   - Railway detecteert automatisch dat het een Node.js app is
   - Klik op "Deploy"
   - Wacht tot deployment klaar is (2-3 minuten)

5. **Krijg je URL:**
   - Railway geeft je automatisch een URL zoals: `renny-dashboard-production.up.railway.app`
   - Je kunt ook een custom domain toevoegen

**Klaar!** Je dashboard is nu live! 🎉

---

## Optie 2: Vercel (Ook Zeer Eenvoudig)

Vercel is ook zeer populair en gratis.

### Stappen:

1. **Installeer Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy vanuit de project folder:**
   ```bash
   cd /Users/pieterdesmet/renny-dashboard
   vercel
   ```

3. **Volg de prompts:**
   - Link to existing project? → N
   - Project name? → renny-dashboard (of wat je wilt)
   - Directory? → ./
   - Override settings? → N

4. **Voor productie:**
   ```bash
   vercel --prod
   ```

Je krijgt een URL zoals: `renny-dashboard.vercel.app`

---

## Optie 3: Render (Alternatief)

1. **Ga naar [render.com](https://render.com)** en maak een account

2. **Klik "New"** → **"Web Service"**

3. **Connect je GitHub repository**

4. **Configureer:**
   - **Name:** renny-dashboard
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

5. **Klik "Create Web Service"**

Je krijgt een URL zoals: `renny-dashboard.onrender.com`

---

## ⚙️ Environment Variables (Optioneel)

Geen speciale environment variables nodig voor deze app, maar als je de poort wilt aanpassen:

- **Railway/Render:** Gebruik automatisch `process.env.PORT`
- **Vercel:** Werkt automatisch

---

## 📝 Notities

- **Railway** heeft een gratis tier met 500 uur/maand
- **Vercel** heeft een gratis tier met onbeperkte deployments
- **Render** heeft een gratis tier maar apps gaan na 15 minuten inactiviteit in "sleep mode"

Voor een dashboard dat je aan anderen wilt tonen, is **Railway** of **Vercel** het beste omdat ze niet in sleep mode gaan.

---

## 🔗 Snelste Methode (Railway)

1. Push naar GitHub
2. Ga naar railway.app
3. Connect GitHub repo
4. Deploy
5. Klaar in 5 minuten! ⚡
