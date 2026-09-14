# 📱 iPhone Scout - Real-Time Reseller Dashboard & Scraper

Automatický systém pro sledování výkupních inzerátů iPhone na Bazoš.cz, Sbazar.cz a Facebook Marketplace s vyhodnocováním cenové matice z Mobil Pohotovosti & iSniper a AI analýzou přes Google Gemini.

## 🚀 Nahrání na GitHub (3 Možnosti)

Webový prohlížeč GitHubu má limit **maximálně 100 souborů na jedno přetažení**. Zde jsou 3 způsoby, jak projekt snadno nahrát:

### Možnost 1: Automatický Skript `push-to-github.bat` (Doporučeno - 1 Kliknutí)
1. Ve složce `alpha` 2x klikněte na soubor **`push-to-github.bat`**.
2. Vložte URL adresu vašeho repozitáře z GitHubu (např. `https://github.com/uzivatel/iphone-scout.git`) a stiskněte **Enter**.
3. Skript sám automaticky nahraje celý projekt bez jakéhokoliv limitu souborů!

### Možnost 2: Přes GitHub Desktop (Oficiální GUI Aplikace)
1. Stáhněte a nainstalujte bezplatnou aplikaci [GitHub Desktop](https://desktop.github.com/).
2. Klepněte na **File** ➔ **Add Local Repository** ➔ vyberte složku `alpha`.
3. Klepněte na **Publish Repository**.

### Možnost 3: Nahrání přes Webový Prohlížeč (Po Částech)
Pokud chcete soubory nahrávat přes prohlížeč na `github.com`:
1. Přetáhněte nejprve kořenové soubory (`package.json`, `tsconfig.json`, `README.md`, `.gitignore`, `.env.example`) a klikněte na **Commit changes**.
2. Potom přetáhněte složku `src` a klikněte na **Commit changes**.
3. Nakonec přetáhněte složku `client`.

---

## ☁️ Deployment na Render.com

1. Přihlaste se na [Render.com](https://render.com/).
2. Klepněte na **New +** ➔ **Web Service** ➔ vyberte repozitář `iphone-scout`.
3. **Environment**: `Node`
4. **Build Command**: `npm run build`
5. **Start Command**: `node dist/server.js`
6. **Instance Type**: `Free`
7. **Environment Variables**:
   - `PORT`: `3000`
   - `NODE_ENV`: `production`
