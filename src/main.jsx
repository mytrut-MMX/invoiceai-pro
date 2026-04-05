import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../mobile-responsive.css";

// SEC-008: Remove legacy local password storage
if (localStorage.getItem('ai_invoice_users')) {
  localStorage.removeItem('ai_invoice_users');
  console.info('[Security] Legacy password storage removed.');
}
if (localStorage.getItem('ai_invoice_reset_tokens')) {
  localStorage.removeItem('ai_invoice_reset_tokens');
  console.info('[Security] Legacy reset tokens removed.');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] Registration failed:', err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
