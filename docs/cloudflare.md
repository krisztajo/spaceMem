# Next.js + OpenNext Cloudflare deploy összefoglaló

## Szükséges lépések és eszközök

1. **OpenNext telepítése**
   - `@opennextjs/cloudflare` csomag a devDependencies között.

2. **Cloudflare Wrangler telepítése**
   - `wrangler` csomag a devDependencies között.

3. **Konfigurációs fájlok**
   - `open-next.config.ts` (OpenNext build beállítások)
   - `wrangler.toml` (Cloudflare Workers/Pages beállítások)

4. **package.json script**
   - Adj hozzá egy build scriptet Cloudflare-re:
     ```json
     "build:cf": "npx @opennextjs/cloudflare build"
     ```

5. **Git**
   - Minden változást commitolni és pusholni kell, hogy a Cloudflare elérje a legfrissebb kódot és scripteket.
   - Figyelj arra, hogy ne legyenek problémás fájlok (pl. `nul` nevű fájl Windows alatt).

6. **Cloudflare Pages/Workers beállítás**
   - A projektet a megfelelő GitHub repóra és branch-re kell kötni.
   - Build parancs: `npm run build:cf`
   - Output directory: (OpenNext/Wrangler automatikusan kezeli)

7. **Automatikus deploy**
   - Minden push után automatikusan indul a build és deploy.
   - Hibák esetén a Cloudflare build logban keresd a részleteket.

## Hibakeresési tippek

# Általános tapasztalatok, tanulságok, best practice-ek

## Gyakori problémák és megoldások

1. **Hiányzó vagy hibás open-next.config.ts**
   - Mindig legyen a projekt gyökerében, és tartalmazza a szükséges dummy cache beállításokat.
   - CI/CD-ben nem lehet interaktív fájl-létrehozás, ezért előre készítsd el.

2. **Nem megfelelő next.config.ts**
   - Ne legyen benne `output: "export"`, mert az statikus exportot generál, ami nem kompatibilis a Cloudflare SSR-rel.
   - Képekhez: `images: { unoptimized: true }` kötelező.

3. **Build parancs hibás beállítása**
   - Cloudflare-en mindig `npm run build:cf` legyen a build command, ne a sima `npm run build`.

4. **Natív modul vagy Node.js-csak csomag használata**
   - Pl. `cheerio`, `fs`, `puppeteer` nem működik Workers-en. Regex vagy más alternatíva kell.

5. **Node.js verzió eltérés**
   - Lokálisan Node.js 22 LTS ajánlott, mert Cloudflare is ezt használja. (nvm/fnm ajánlott)

6. **API route dinamikussá tétele**
   - Minden API route-ban legyen: `export const dynamic = "force-dynamic";`

7. **Környezeti változók kezelése**
   - Lokálisan `.env.local`, Cloudflare-en dashboardon kell beállítani a Secrets-et.

8. **wrangler.toml helyes kitöltése**
   - `compatibility_flags = ["nodejs_compat"]` kötelező, különben nem lesznek elérhetők a Node.js API-k.

9. **Push előtt ellenőrzés**
   - Ne legyen tiltott nevű fájl (pl. `nul`), minden változás legyen commitolva.

10. **Cloudflare build log figyelése**

- Hibák esetén mindig a build logban keresd a részleteket.

## Ajánlott workflow

1. Fejlesztés: `npm run dev` (Next.js dev szerver)
2. Cloudflare build teszt: `npm run build:cf && npm run preview` (wrangler dev)
3. Deploy: git push → Cloudflare Pages automatikus build

## Ellenőrzőlista új projekt indításához

- [ ] `@opennextjs/cloudflare` és `wrangler` telepítve devDependencies-ként
- [ ] `open-next.config.ts` létezik és teljes (dummy cache, edgeExternals, middleware)
- [ ] `wrangler.toml` létezik, `nodejs_compat` flag megvan
- [ ] `next.config.ts`-ben `images: { unoptimized: true }`
- [ ] Minden API route-ban `export const dynamic = "force-dynamic"`
- [ ] Nincs Node.js-csak csomag az importokban (`cheerio`, `fs`, `puppeteer`, stb.)
- [ ] Cloudflare Pages build command: `npm run build:cf`
- [ ] Cloudflare Pages output directory: `.open-next`
- [ ] Környezeti változók felvéve Cloudflare Secrets-be
- [ ] `.env.local` fent van `.gitignore`-ban

---

Ezek az általános tapasztalatok és tanulságok segítenek, hogy bármikor újra, vagy másik projektben is sikeresen tudj Next.js-t Cloudflare Workers-re deployolni.

# Ajánlott csomagverziók és Node.js verzió

Tapasztalatok alapján ezek a verziók működnek stabilan együtt Cloudflare Workers deploy esetén (2026. március):

| Csomag                 | Ajánlott verzió | Megjegyzés                                   |
| ---------------------- | --------------- | -------------------------------------------- |
| next                   | 16.2.1          | (vagy a legfrissebb 16.x)                    |
| react                  | 19.2.4          |                                              |
| react-dom              | 19.2.4          |                                              |
| @opennextjs/cloudflare | ^1.17.3         | (mindig a Next.js-hez illő verziót használd) |
| wrangler               | ^4.77.0         |                                              |
| typescript             | ^5              |                                              |
| @types/node            | ^20             |                                              |
| @types/react           | ^19             |                                              |
| @types/react-dom       | ^19             |                                              |
| tailwindcss            | ^4              |                                              |
| eslint                 | ^9              |                                              |
| eslint-config-next     | 16.2.1          |                                              |

**Node.js verzió:**

- Lokálisan: **22.x LTS** (pl. 22.16.0) – ez a Cloudflare Workers által támogatott verzió, így elkerülhetők a natív modul hibák.
- Ne használj Node.js 4-et, mert több natív modul (pl. @ast-grep/napi) nem támogatja!

**Fontos:**

- Ha bármelyik csomagból újabb főverzió jelenik meg, mindig nézd meg az OpenNext és Cloudflare Workers kompatibilitási táblázatát!
- Ha verzióütközés vagy natív modul hiba van, próbáld meg a fenti verziókat használni.
  Ez a lista segít, hogy később gyorsan újra be tudd állítani a Cloudflare deployt Next.js + OpenNext projekthez.
