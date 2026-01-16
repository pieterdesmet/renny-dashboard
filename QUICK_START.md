# ⚡ Snelste Weg naar Live Dashboard

## 🚀 Optie 1: Railway (5 minuten - Aanbevolen)

1. **Push naar GitHub:**
   ```bash
   cd /Users/pieterdesmet/renny-dashboard
   git init
   git add .
   git commit -m "Renny Dashboard"
   # Maak een nieuwe repo op github.com en dan:
   git remote add origin <jouw-repo-url>
   git push -u origin main
   ```

2. **Ga naar [railway.app](https://railway.app)** en login met GitHub

3. **Klik "New Project"** → **"Deploy from GitHub repo"**

4. **Selecteer je repository** → Railway doet de rest automatisch!

5. **Klaar!** Je krijgt een URL zoals: `renny-dashboard-production.up.railway.app`

---

## 🌐 Optie 2: Vercel (3 minuten)

1. **Installeer Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd /Users/pieterdesmet/renny-dashboard
   vercel
   ```

3. **Volg de prompts** → Klaar!

Je krijgt een URL zoals: `renny-dashboard.vercel.app`

---

## 💡 Tip

**Railway** is het eenvoudigst omdat het automatisch alles detecteert en configureert. Geen extra configuratie nodig!

Zie `DEPLOY.md` voor meer details en alternatieven.
