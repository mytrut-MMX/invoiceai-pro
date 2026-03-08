# 📱 Ghid Complet: Mobile-Friendly AI Invoice

## PASUL 1 — Adaugă fișierul CSS

Copiază `mobile-responsive.css` în folderul `src/` al proiectului tău.

## PASUL 2 — Importă CSS-ul în `main.jsx`

Deschide `src/main.jsx` și adaugă importul:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './mobile-responsive.css'    // ← ADAUGĂ ASTA

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## PASUL 3 — Actualizează viewport meta tag

În `index.html`, confirmă că ai deja (e OK):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Adaugă și suport pentru safe areas (iPhone notch/Dynamic Island):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

## PASUL 4 — Modificări în App.jsx (secțiunea <style>)

Înlocuiește blocul `<style>` existent din componenta `App()` (la final):

```jsx
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box} body{margin:0}
  @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
  ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#DDD;border-radius:10px}
  
  /* ── MOBILE LAYOUT ───────────────────────────────── */
  @media(max-width:768px){
    .sidebar-desktop{display:none!important}
    .mobile-topbar{display:flex!important}
    .mobile-bottom-nav{display:flex!important}
    .main-content{margin-left:0!important;padding-top:56px!important;padding-bottom:68px!important}
    
    /* Form grids → single column */
    .mobile-stack{grid-template-columns:1fr!important}
    
    /* Tables: smaller padding */
    table th,table td{padding:8px 10px!important}
    
    /* Modals: full-screen */
    .modal-content{
      max-width:100vw!important;
      max-height:100vh!important;
      border-radius:0!important;
      height:100vh!important;
      width:100vw!important;
    }
  }
  @media(min-width:769px){
    .mobile-topbar{display:none!important}
    .mobile-bottom-nav{display:none!important}
  }
  
  /* ── SAFE AREA (iPhone) ──────────────────────────── */
  @supports(padding-top:env(safe-area-inset-top)){
    .mobile-topbar{padding-top:env(safe-area-inset-top)!important}
    .mobile-bottom-nav{padding-bottom:env(safe-area-inset-bottom)!important}
  }
  
  /* ── INPUT ZOOM FIX (iOS) ────────────────────────── */
  @media(max-width:768px){
    input,select,textarea{font-size:16px!important}
  }
`}</style>
```

## PASUL 5 — Modificări specifice în componente

### 5a. InvoiceForm — Header cu butoane (wrap pe mobile)

Caută acest div din InvoiceForm:
```jsx
<div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
```

Schimbă în:
```jsx
<div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
  <div style={{ minWidth:0, flex:"1 1 200px" }}>
    {/* title */}
  </div>
  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
    {/* buttons */}
  </div>
</div>
```

### 5b. Tabele — Adaugă wrapper scrollabil

Fiecare tabel trebuie înfășurat într-un div scrollabil:
```jsx
<div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:500 }}>
    {/* ... */}
  </table>
</div>
```

### 5c. LineItemsTable — Grid responsive

Schimbă grid-ul de pe mobile. Înlocuiește:
```jsx
const cols = isVat ? "1fr 68px 84px 76px 74px 28px" : "1fr 68px 90px 80px 28px";
```

Cu:
```jsx
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
const cols = isMobile 
  ? "1fr 50px 70px 60px 24px"  // mobile: fără VAT, mai compact
  : isVat ? "1fr 68px 84px 76px 74px 28px" : "1fr 68px 90px 80px 28px";
```

### 5d. Modals — Full-screen pe mobile

Pentru fiecare modal (CustomerModal, ItemModal, PaymentModal, etc.), adaugă `className="modal-content"` pe div-ul interior și modifică stilurile:

```jsx
<div style={{ 
  position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", 
  display:"flex", alignItems:"center", justifyContent:"center", 
  zIndex:1000, padding: window.innerWidth <= 768 ? 0 : 20 
}}>
  <div className="modal-content" style={{ 
    background:"#fff", borderRadius: window.innerWidth <= 768 ? 0 : 16, 
    width:"100%", maxWidth:600, 
    maxHeight: window.innerWidth <= 768 ? "100vh" : "92vh",
    display:"flex", flexDirection:"column", 
    boxShadow:"0 20px 60px rgba(0,0,0,0.18)" 
  }}>
```

### 5e. MobileTopBar — Safe area support

Actualizează înălțimea:
```jsx
function MobileTopBar({ activePage, onMenuOpen, sidebarBg }) {
  return (
    <div className="mobile-topbar" style={{ 
      display:"none", position:"fixed", top:0, left:0, right:0, 
      minHeight:52, background:sidebarBg, zIndex:200, 
      alignItems:"center", padding:"0 16px", gap:12,
      paddingTop:"env(safe-area-inset-top, 0px)"  // iPhone safe area
    }}>
```

### 5f. MobileBottomNav — Safe area support

```jsx
function MobileBottomNav({ active, setActive }) {
  return (
    <div className="mobile-bottom-nav" style={{ 
      display:"none", position:"fixed", bottom:0, left:0, right:0, 
      minHeight:60, background:"#1A1A1A", zIndex:200, 
      borderTop:"1px solid rgba(255,255,255,0.08)", 
      alignItems:"center", justifyContent:"space-around",
      paddingBottom:"env(safe-area-inset-bottom, 0px)"  // iPhone safe area
    }}>
```

## PASUL 6 — Testare

### Desktop
- Deschide Chrome DevTools (F12)
- Click pe iconița "Toggle device toolbar" (Ctrl+Shift+M)
- Testează pe: iPhone 14 Pro, Samsung Galaxy S21, iPad

### Checklist de verificat:
- [ ] Login page se vede bine pe mobile
- [ ] Org Setup scrollable, toate câmpurile visible
- [ ] Sidebar ascuns, Top bar + Bottom nav vizibile
- [ ] Dashboard: stat cards pe 2 coloane
- [ ] Tabele scrollabile orizontal
- [ ] Formulare: câmpuri stivuite vertical
- [ ] Modale: full-screen pe mobile
- [ ] Butoane suficient de mari pentru touch (min 38px)
- [ ] Input-urile nu fac zoom pe iOS (font-size: 16px)
- [ ] iPhone notch/Dynamic Island nu acoperă conținut

## Ce face CSS-ul atașat?

| Problemă | Soluție |
|----------|---------|
| Sidebar ocupă spațiu pe mobile | Se ascunde, apare top bar + bottom nav |
| Tabele depășesc ecranul | Scroll orizontal + text mai mic |
| Grile 2-3 coloane | Se fac 1 coloană pe mobile |
| Modale cu maxWidth fix | Full-screen pe mobile |
| Butoane mici | Min 38px touch target |
| iOS zoom la focus pe input | Font-size forțat la 16px |
| iPhone notch/island | Safe area padding |
| Print | Ascunde sidebar/nav, full width |

## Bonus: PWA (Progressive Web App)

Pentru o experiență și mai bună pe telefon, adaugă în `index.html`:

```html
<head>
  <!-- ... existing tags ... -->
  <meta name="theme-color" content="#1A1A1A" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="apple-touch-icon" href="/favicon.svg" />
</head>
```

Asta face ca aplicația să arate ca o app nativă când utilizatorul o adaugă pe Home Screen din Safari/Chrome.
