# Golden Source Technologies – Full‑Stack E‑Commerce Platform

This is the production codebase that powers **goldensourcetech.co.ke**. It combines a modern storefront written in HTML/CSS/Vanilla JS with an Express/SQLite backend, an admin dashboard, secure media handling, and automated backups. The project is deployed on **Render** (backend + static assets) and the custom domain is managed on **TrueHost**.

---

## ✨ Feature Overview

### Storefront
- Dynamic product listings by category with live API data
- Rich product detail page with specifications, gallery, wishlist & cart hooks
- Global search with filters, sticky navigation, responsive design, and hero video
- Persistent cart & wishlist (localStorage) plus graceful fallbacks for offline/empty states

### Backend & Admin
- Node 18 + Express 5 API exposing `/api/products`, `/api/orders`, `/api/auth`, `/api/admin/*`
- SQLite (via Sequelize) with automatic migrations, sample seed generation, and rolling JSON backups
- File uploads with Sharp processing, sanitizer, malware scan hooks, and disk caching
- Admin SPA (`/admin`) for managing products, orders, and analytics (JWT auth + token storage)
- Rate limiting, Helmet CSP, CORS safelist, and Structured logging hooks

### Deployment & Ops
- Single Render service driven by `render.yaml` and `Procfile`
- Custom domain (`goldensourcetech.co.ke`) via TrueHost DNS (CNAME + A records)
- Automatic SSL + HTTPS enforcement from Render
- Backup scheduler + health endpoints (`/api/health`, `/api/images/*`) for monitoring

---

## 🗂️ Repository Layout

```
.
├── admin/                 # Admin dashboard UI (HTML/CSS/JS)
├── backend/               # Express application & services
│   ├── config/            # Sequelize + persistent storage helpers
│   ├── database/          # Backup scripts (runtime JSON backups ignored)
│   ├── middleware/        # Auth & image security
│   ├── models/            # Sequelize models (Product, User, Order)
│   ├── routes/            # REST endpoints (auth, products, orders, images, admin)
│   ├── services/          # Image processing, caching, monitoring
│   └── server-production.js
├── images/                # Public images & uploaded assets (served via Express)
├── js/, css/, *.html      # Storefront assets & pages
├── Procfile               # Render process definition
├── render.yaml            # Render IaC configuration
└── package.json           # Root scripts proxying to backend
```

---

## ⚙️ Local Development

### Requirements
- Node.js ≥ 18
- npm ≥ 8

### Setup & Run
```bash
# Install dependencies (installs backend deps via postinstall)
npm install

# Start the Express API + static frontend
npm start

# Dev mode with nodemon + SQLite playground
cd backend && npm run dev
```
Access the site at `http://localhost:5000` and the admin panel at `http://localhost:5000/admin`.

---

## 🚢 Deployment Workflow

1. **Code changes**
   ```bash
   git add .
   git commit -m "Describe change"
   git push origin main
   ```
2. **Render auto-deploy**
   - `render.yaml` installs deps (`npm run install-deps`)
   - `Procfile` runs `cd backend && npm start`
3. **Custom domain**
   - `www` CNAME → `nairobi-cameras-website-store.onrender.com`
   - `@` A record  → `216.24.57.1`
   - Both managed in TrueHost DNS Manager

---

## 🧹 Runtime Artifacts & Backups

- Uploaded/seed images live in `/images/uploads`
- Runtime caches/logs/backups are ignored (`backend/cache`, `backend/logs`, `backend/database/backup.json`)
- Automatic backups run every 5 minutes (see `backend/database/backup-data.js`)
- To restore data, drop the SQLite file and restart—`restoreData` seeds from the latest JSON backup if present

---

## 🧪 Manual QA Checklist

- Storefront
  - Landing hero, featured products, category pages, search, wishlist/cart
- Product detail
  - Image gallery, specs, related items, add-to-cart
- Admin dashboard
  - Login/logout, CRUD products, order statuses, analytics widgets
- API health
  - `GET /api/health`, `GET /api/products`, `GET /api/images/metrics`
- Image upload
  - `/api/upload` handles local files + external URLs with validation

---

## 🤝 Support

- **Email:** Goldensourcetechnologies@gmail.com  
- **Phone:** +254 724 369 971

For DNS/hosting assistance, open a TrueHost ticket. For deployment/runtime issues, inspect Render logs and the health endpoints above.

---

**Golden Source Technologies** – Professional electronics and technology solutions, delivered end‑to‑end.