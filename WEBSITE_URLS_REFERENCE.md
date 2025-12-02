# Golden Source Technologies - Complete URL Reference

## 🌐 Base URL
**Production:** `https://goldensourcetech.co.ke`  
**Local Development:** `http://localhost:5000` (or your local port)

---

## 📄 Main Pages

### Homepage
- **URL:** `https://goldensourcetech.co.ke/`
- **File:** `index.html`
- **Priority:** 1.0 (Highest)
- **Description:** Main landing page with featured products

### Category Pages (Priority: 0.9)

1. **Laptops**
   - **URL:** `https://goldensourcetech.co.ke/laptops`
   - **File:** `laptops.html`
   - **Alternative:** `https://goldensourcetech.co.ke/laptops.html` (also works)

2. **Phones**
   - **URL:** `https://goldensourcetech.co.ke/phones`
   - **File:** `phones.html`
   - **Alternative:** `https://goldensourcetech.co.ke/phones.html` (also works)

3. **Cameras**
   - **URL:** `https://goldensourcetech.co.ke/cameras`
   - **File:** `cameras.html`
   - **Alternative:** `https://goldensourcetech.co.ke/cameras.html` (also works)

4. **Audio & Headphones**
   - **URL:** `https://goldensourcetech.co.ke/audio`
   - **File:** `audio.html`
   - **Alternative:** `https://goldensourcetech.co.ke/audio.html` (also works)

5. **Accessories**
   - **URL:** `https://goldensourcetech.co.ke/accessories`
   - **File:** `accessories.html`
   - **Alternative:** `https://goldensourcetech.co.ke/accessories.html` (also works)

6. **Smart Home**
   - **URL:** `https://goldensourcetech.co.ke/smart-home`
   - **File:** `smart-home.html`
   - **Alternative:** `https://goldensourcetech.co.ke/smart-home.html` (also works)

7. **Deals & Promotions**
   - **URL:** `https://goldensourcetech.co.ke/deals`
   - **File:** `deals.html`
   - **Alternative:** `https://goldensourcetech.co.ke/deals.html` (also works)

### Functional Pages

8. **Shopping Cart**
   - **URL:** `https://goldensourcetech.co.ke/cart`
   - **File:** `cart.html`
   - **Priority:** 0.7
   - **SEO:** `noindex, nofollow` (not indexed by search engines)

9. **Search Results**
   - **URL:** `https://goldensourcetech.co.ke/search`
   - **File:** `search.html`
   - **With Query:** `https://goldensourcetech.co.ke/search?q=iphone`
   - **Priority:** 0.6
   - **SEO:** `noindex, follow` (not indexed but followed)

10. **Product Details** (Dynamic)
    - **URL Pattern:** `https://goldensourcetech.co.ke/product?id=PRODUCT_ID`
    - **Example:** `https://goldensourcetech.co.ke/product?id=123`
    - **File:** `product.html`
    - **Note:** Product pages are dynamically generated and not in sitemap (discovered via category pages)

### Admin Pages

11. **Admin Dashboard**
    - **URL:** `https://goldensourcetech.co.ke/admin`
    - **File:** `admin/index.html`
    - **Note:** Excluded from sitemap and robots.txt (not indexed)

---

## 🔗 API Endpoints

### Public APIs
- **Health Check:** `https://goldensourcetech.co.ke/api/health`
- **Get Products:** `https://goldensourcetech.co.ke/api/products`
- **Get Product by ID:** `https://goldensourcetech.co.ke/api/products/:id`
- **Search Products:** `https://goldensourcetech.co.ke/api/search?q=query`
- **Get Orders:** `https://goldensourcetech.co.ke/api/orders`

### Admin APIs (Protected)
- **Create Product:** `POST https://goldensourcetech.co.ke/api/products`
- **Update Product:** `PUT https://goldensourcetech.co.ke/api/products/:id`
- **Delete Product:** `DELETE https://goldensourcetech.co.ke/api/products/:id`
- **Admin Routes:** `https://goldensourcetech.co.ke/api/admin/*`

---

## 📋 SEO Files

### Sitemap
- **URL:** `https://goldensourcetech.co.ke/sitemap.xml`
- **File:** `sitemap.xml`
- **Contains:** All main pages (homepage, categories, cart, search)

### Robots.txt
- **URL:** `https://goldensourcetech.co.ke/robots.txt`
- **File:** `robots.txt`
- **Purpose:** Tells search engines what to crawl

---

## 🎯 URL Structure Summary

### Clean URLs (Recommended)
All pages use clean URLs without `.html` extension:
- ✅ `https://goldensourcetech.co.ke/laptops`
- ✅ `https://goldensourcetech.co.ke/phones`
- ✅ `https://goldensourcetech.co.ke/cart`

### Legacy URLs (Also Supported)
For backward compatibility, `.html` URLs also work:
- ✅ `https://goldensourcetech.co.ke/laptops.html`
- ✅ `https://goldensourcetech.co.ke/phones.html`

### Dynamic URLs
- Product pages: `/product?id=PRODUCT_ID`
- Search: `/search?q=SEARCH_TERM`

---

## 📊 Sitemap Priority Guide

| Priority | Pages | Description |
|----------|-------|-------------|
| 1.0 | Homepage | Most important page |
| 0.9 | Category Pages | High importance (laptops, phones, cameras, etc.) |
| 0.7 | Cart | Medium importance |
| 0.6 | Search | Lower importance |
| N/A | Product Pages | Discovered via category pages |
| N/A | Admin | Not indexed |

---

## 🔍 How URLs Work

### Backend Routing
The Express server (`backend/server-production.js`) handles clean URLs:
```javascript
// Clean URLs (without .html extension)
const htmlPages = [
    'cart', 'search', 'product',
    'phones', 'laptops', 'cameras', 'audio', 
    'accessories', 'smart-home', 'deals'
];

htmlPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `../${page}.html`));
    });
});
```

### URL Examples

**Category Pages:**
- `https://goldensourcetech.co.ke/laptops` → `laptops.html`
- `https://goldensourcetech.co.ke/phones` → `phones.html`
- `https://goldensourcetech.co.ke/cameras` → `cameras.html`

**Product Pages:**
- `https://goldensourcetech.co.ke/product?id=1` → Shows product with ID 1
- `https://goldensourcetech.co.ke/product?id=25` → Shows product with ID 25

**Search:**
- `https://goldensourcetech.co.ke/search` → Search page
- `https://goldensourcetech.co.ke/search?q=iphone` → Search results for "iphone"

---

## ✅ Quick Reference Checklist

### Main Pages (In Sitemap)
- [x] `/` - Homepage
- [x] `/laptops` - Laptops category
- [x] `/phones` - Phones category
- [x] `/cameras` - Cameras category
- [x] `/audio` - Audio category
- [x] `/accessories` - Accessories category
- [x] `/smart-home` - Smart Home category
- [x] `/deals` - Deals category
- [x] `/cart` - Shopping cart
- [x] `/search` - Search page

### Dynamic Pages (Not in Sitemap)
- [ ] `/product?id=XXX` - Product details (discovered via category pages)

### Admin Pages (Not in Sitemap)
- [ ] `/admin` - Admin dashboard (excluded from indexing)

### SEO Files
- [x] `/sitemap.xml` - XML sitemap
- [x] `/robots.txt` - Robots file

---

## 🚀 Testing URLs

After deployment, test these URLs:
1. `https://goldensourcetech.co.ke/` - Homepage
2. `https://goldensourcetech.co.ke/sitemap.xml` - Sitemap
3. `https://goldensourcetech.co.ke/robots.txt` - Robots file
4. `https://goldensourcetech.co.ke/laptops` - Category page
5. `https://goldensourcetech.co.ke/product?id=1` - Product page (if you have products)

---

## 📝 Notes

1. **Product Pages**: Not included in sitemap because they're dynamic and numerous. Google will discover them through category pages and internal links.

2. **Admin Pages**: Excluded from sitemap and robots.txt to prevent indexing of admin areas.

3. **Clean URLs**: The site uses clean URLs (no `.html` extension) for better SEO, but `.html` URLs still work for backward compatibility.

4. **HTTPS**: All URLs use HTTPS in production (enforced by Render).

5. **Domain**: Replace `goldensourcetech.co.ke` with your actual domain if different.






