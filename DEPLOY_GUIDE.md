# 🚀 InvoiceAI Pro — Deploy Guide

## What you're deploying
A full invoice management system with:
- Company setup wizard (runs once)
- Dashboard with live stats
- Invoice creation, PDF export, email sending
- Client & product/service management
- AI assistant for natural language invoicing
- Custom invoice template support

---

## STEP 1 — Create GitHub account
Go to **github.com** → Sign up (free)

---

## STEP 2 — Create repository & upload files

1. Go to **github.com/new**
2. Name: `invoiceai-pro` → click **Create repository**
3. Click **"uploading an existing file"**
4. Upload all files maintaining the folder structure:

```
invoiceai-pro/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── api/
│   └── chat.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── store/
    │   └── index.js
    ├── pages/
    │   ├── SetupWizard.jsx
    │   └── Dashboard.jsx
    └── components/
        ├── InvoiceEditor.jsx
        ├── InvoicePreview.jsx
        └── AIChat.jsx
```

> Tip: When uploading, GitHub lets you drag entire folders.

---

## STEP 3 — Deploy to Vercel

1. Go to **vercel.com** → Sign up with GitHub
2. Click **"Add New Project"**
3. Select `invoiceai-pro` → click **Import**
4. Click **Deploy** (Vercel auto-detects Vite)
5. Wait ~90 seconds ✅

Your URL: `https://invoiceai-pro-yourname.vercel.app`

---

## STEP 4 — Share with anyone

Send the link. Each user will:
1. Complete the **company setup wizard** (one time, ~2 min)
2. Enter their **Anthropic API key** (from console.anthropic.com — $5 free credit on signup)
3. Optionally configure **EmailJS** for sending invoices by email
4. Start creating invoices!

---

## Setting up EmailJS (for email sending)

1. Go to **emailjs.com** → Create free account
2. **Email Services** → Add Service → connect Gmail/Outlook/SMTP
3. **Email Templates** → Create template with these variables:
   ```
   To: {{to_email}}
   Subject: Invoice {{invoice_number}} from {{from_name}}
   
   Dear {{to_name}},
   
   Please find attached invoice {{invoice_number}} for {{amount}}.
   Due date: {{due_date}}
   
   {{from_name}}
   ```
4. Copy **Service ID**, **Template ID**, **Public Key**
5. Enter them in the app under **Settings → EmailJS**

Free plan: 200 emails/month

---

## FAQ

**Q: Where is data stored?**
A: In the user's browser (localStorage). Private, no server needed.

**Q: Can multiple people share the same instance?**
A: Each person on a different device/browser has their own separate data.

**Q: How much does the AI cost?**
A: ~$0.01–0.03 per AI conversation. Anthropic gives $5 free credit.

**Q: Can I use a custom domain?**
A: Yes — connect any domain in Vercel project settings (free plan supports this).

**Q: How do I update the app?**
A: Push changes to GitHub → Vercel redeploys automatically in ~60 seconds.
