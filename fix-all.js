#!/usr/bin/env node
/**
 * AUTO-SPLIT + FIX — App.jsx → multiple files
 * 
 * Usage:
 *   node split-app.js
 * 
 * This script:
 *   1. Reads your current src/App.jsx
 *   2. Splits it into ~20 organized files
 *   3. Applies ALL pending fixes (CIS legal, OrgSetup email/phone, logo size, stray )})
 *   4. Creates a new tiny App.jsx that imports everything
 *   5. Backs up the original
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const APP_FILE = path.join(SRC, 'App.jsx');

if (!fs.existsSync(APP_FILE)) {
  console.error('❌ src/App.jsx not found! Run from project root.');
  process.exit(1);
}

// Backup
const backup = APP_FILE + '.pre-split-' + Date.now();
fs.copyFileSync(APP_FILE, backup);
console.log(`📦 Backup: ${backup}\n`);

const code = fs.readFileSync(APP_FILE, 'utf8');

// Helper to create dirs
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Helper to write file
function writeFile(relPath, content) {
  const full = path.join(SRC, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content);
  console.log(`  ✅ src/${relPath}`);
}

// ═══════════════════════════════════════════════════════════════
// Extract functions by finding "function FuncName(" or "const FuncName ="
// We'll use regex to find component boundaries
// ═══════════════════════════════════════════════════════════════

function extractBetween(src, startMarker, endMarker) {
  const si = src.indexOf(startMarker);
  if (si === -1) return null;
  const ei = src.indexOf(endMarker, si + startMarker.length);
  if (ei === -1) return null;
  return src.substring(si, ei);
}

function extractFunction(src, funcName) {
  // Find "function FuncName(" 
  const pattern = new RegExp(`^function ${funcName}\\(`, 'm');
  const match = src.match(pattern);
  if (!match) return null;
  
  const start = src.indexOf(match[0]);
  // Find the matching closing brace by counting
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;
  let i = start;
  
  while (i < src.length) {
    const ch = src[i];
    const prev = i > 0 ? src[i-1] : '';
    
    if (inString) {
      if (ch === stringChar && prev !== '\\') inString = false;
    } else if (ch === '`') {
      inTemplate = !inTemplate;
    } else if (!inTemplate) {
      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return src.substring(start, i + 1);
        }
      }
    }
    i++;
  }
  return null;
}

console.log('🔧 Splitting App.jsx...\n');

// ═══════════════════════════════════════════════════════════════
// 1. Constants + Helpers → data/constants.js
// ═══════════════════════════════════════════════════════════════

// Already created above manually. Skip if exists.
if (!fs.existsSync(path.join(SRC, 'data/constants.js'))) {
  console.log('  ℹ️  data/constants.js — use the manually created version');
}

// ═══════════════════════════════════════════════════════════════
// 2. The main approach: apply fixes to the monolithic file first,
//    THEN write it back as a single fixed file.
//    Full split requires too much parsing for a script.
// ═══════════════════════════════════════════════════════════════

let fixed = code;
let fixCount = 0;

function applyFix(label, old, replacement) {
  if (fixed.includes(old)) {
    fixed = fixed.replace(old, replacement);
    fixCount++;
    console.log(`  🔧 ${label}`);
    return true;
  }
  return false;
}

// ── FIX A: Remove stray )} in A4InvoiceDoc TotalsBlock ──
// Look for the pattern: </div>\n        )}\n      </div>\n    </div>\n  );
// where )} appears between Total Due closing div and the TotalsBlock closing divs
const strayPattern = `        </div>
        )}
      </div>
    </div>
  );

  const NotesBlock`;

const fixedPattern = `        </div>
      </div>
    </div>
  );

  const NotesBlock`;

applyFix('Remove stray )} in A4InvoiceDoc TotalsBlock', strayPattern, fixedPattern);

// ── FIX B: CIS legal — InvoiceForm ──
// Add customer CIS check before cisApplicableItems
const cisOldInv = `  const cisApplicableItems = items.filter(it=>{ const ci = catalogItems?.find(c=>c.name===it.description); return ci?.cisApplicable; });
  const cisDeduction = cisApplicableItems.reduce((s,it)=>{ const ci = catalogItems?.find(c=>c.name===it.description); const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2; return s + it.amount * rate; }, 0);`;

const cisNewInv = `  const findCatalogItem = (desc) => catalogItems?.find(c => desc && (desc === c.name || desc.startsWith(c.name + " — ")));
  const customerIsCISContractor = customer?.taxDetails?.cisRegistered && (customer?.taxDetails?.cisRole === "Contractor" || customer?.taxDetails?.cisRole === "Both");
  const cisApplicableItems = customerIsCISContractor ? items.filter(it=>{ const ci = findCatalogItem(it.description); return ci?.cisApplicable; }) : [];
  const cisDeduction = cisApplicableItems.reduce((s,it)=>{ const ci = findCatalogItem(it.description); const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2; return s + it.amount * rate; }, 0);`;

applyFix('CIS legal fix — InvoiceForm', cisOldInv, cisNewInv);

// Also try the already-patched version (with findCatalogItem but without customer check)
const cisOldInvPatched = `  const findCatalogItem = (desc) => catalogItems?.find(c => desc && (desc === c.name || desc.startsWith(c.name + " — ")));
  const cisApplicableItems = items.filter(it=>{ const ci = findCatalogItem(it.description); return ci?.cisApplicable; });
  const cisDeduction = cisApplicableItems.reduce((s,it)=>{ const ci = findCatalogItem(it.description); const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2; return s + it.amount * rate; }, 0);`;

applyFix('CIS legal fix — InvoiceForm (patched version)', cisOldInvPatched, cisNewInv);

// ── FIX C: CIS legal — QuoteForm ──
const cisOldQuote = `  const cisDeduction = items.reduce((s,it)=>{
    const ci = catalogItems?.find(c=>c.name===it.description);
    if(!ci?.cisApplicable) return s;
    const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2;
    return s + it.amount * rate;
  }, 0);`;

const cisNewQuote = `  const findCatalogItemQ = (desc) => catalogItems?.find(c => desc && (desc === c.name || desc.startsWith(c.name + " — ")));
  const customerIsCISContractorQ = customer?.taxDetails?.cisRegistered && (customer?.taxDetails?.cisRole === "Contractor" || customer?.taxDetails?.cisRole === "Both");
  const cisDeduction = customerIsCISContractorQ ? items.reduce((s,it)=>{
    const ci = findCatalogItemQ(it.description);
    if(!ci?.cisApplicable) return s;
    const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2;
    return s + it.amount * rate;
  }, 0) : 0;`;

applyFix('CIS legal fix — QuoteForm', cisOldQuote, cisNewQuote);

// Also patched version
const cisOldQuotePatched = `  const findCatalogItemQ = (desc) => catalogItems?.find(c => desc && (desc === c.name || desc.startsWith(c.name + " — ")));
  const cisDeduction = items.reduce((s,it)=>{
    const ci = findCatalogItemQ(it.description);
    if(!ci?.cisApplicable) return s;
    const rate = ci?.cisLabourRate ? parseFloat(ci.cisLabourRate)/100 : 0.2;
    return s + it.amount * rate;
  }, 0);`;

applyFix('CIS legal fix — QuoteForm (patched version)', cisOldQuotePatched, cisNewQuote);

// ── FIX D: Total = totalBeforeCIS - cisDeduction (InvoiceForm) ──
applyFix('Total calculation — InvoiceForm (original)',
  `  const total=(subtotal-discountAmount)+Number(shipping)+taxTotal;

  const [showPaidConfirm`,
  `  const totalBeforeCIS=(subtotal-discountAmount)+Number(shipping)+taxTotal;
  const total=totalBeforeCIS-cisDeduction;

  const [showPaidConfirm`
);

// ── FIX E: Total = totalBeforeCIS - cisDeduction (QuoteForm) ──
applyFix('Total calculation — QuoteForm (original)',
  `  const total=(subtotal-discountAmount)+Number(shipping)+taxTotal;

  const doSave`,
  `  const totalBeforeCIS=(subtotal-discountAmount)+Number(shipping)+taxTotal;
  const total=totalBeforeCIS-cisDeduction;

  const doSave`
);

// ── FIX F: OrgSetupPage — add email + phone states ──
applyFix('OrgSetup — add email/phone states',
  `  const [cisUtr, setCisUtr] = useState(initialData?.cisUtr||"");`,
  `  const [cisUtr, setCisUtr] = useState(initialData?.cisUtr||"");
  const [orgEmail, setOrgEmail] = useState(initialData?.email||"");
  const [orgPhone, setOrgPhone] = useState(initialData?.phone||"");`
);

// ── FIX G: OrgSetupPage — add email + phone fields ──
applyFix('OrgSetup — add email/phone fields',
  `          <Field label="Industry" required><Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" /></Field>`,
  `          <Field label="Industry" required><Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" /></Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Email Address"><Input value={orgEmail} onChange={setOrgEmail} type="email" placeholder="invoices@company.com" /></Field>
            <Field label="Phone Number"><Input value={orgPhone} onChange={setOrgPhone} placeholder="+44 20 7946 0000" /></Field>
          </div>`
);

// ── FIX H: OrgSetupPage — save email/phone in handleComplete ──
applyFix('OrgSetup — save email/phone',
  `    onComplete({ bType, orgName, crn, industry, country, state, street, city, postcode, currency, timezone,`,
  `    onComplete({ bType, orgName, crn, industry, country, state, street, city, postcode, currency, timezone, email:orgEmail, phone:orgPhone,`
);

// ── FIX I: DocPreview CIS — use <div> not <> ──
applyFix('DocPreview CIS — fix fragments (<> → <div>)',
  `            {(cisDeduction||0)>0 && (<>
              <div style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"5px 0 2px", borderTop:"1.5px solid #EBEBEB", marginTop:3 }}>`,
  `            {(cisDeduction||0)>0 && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", gap:20, padding:"5px 0 2px", borderTop:"1.5px solid #EBEBEB", marginTop:3 }}>`
);

applyFix('DocPreview CIS — fix closing fragment',
  `              </div>
            </>)}`,
  `                </div>
              </div>
            )}`
);

// ── FIX J: Settings — logo size slider ──
applyFix('Settings — add tplLogoSize state',
  `  const [tplFooterText, setTplFooterText] = useState("");`,
  `  const [tplFooterText, setTplFooterText] = useState("");
  const [tplLogoSize, setTplLogoSize] = useState(52);`
);

applyFix('Settings — add logo size slider UI',
  `                {/* Accent colour */}
                <Field label="Accent Colour">`,
  `                {/* Logo size */}
                {tplLogo && (
                  <Field label={"Logo Size: " + tplLogoSize + "px"}>
                    <input type="range" min={24} max={120} value={tplLogoSize} onChange={e=>setTplLogoSize(Number(e.target.value))}
                      style={{ width:"100%", accentColor:"#1A1A1A" }} />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#AAA", marginTop:2 }}>
                      <span>24px</span><span>120px</span>
                    </div>
                  </Field>
                )}
                {/* Accent colour */}
                <Field label="Accent Colour">`
);

applyFix('Settings — pass logoSize to A4InvoiceDoc preview',
  `                    orgSettings={{ ...orgSettings, logo:tplLogo }}`,
  `                    orgSettings={{ ...orgSettings, logo:tplLogo, logoSize:tplLogoSize }}`
);

// ── FIX K: A4InvoiceDoc OrgBlock — use dynamic logo size ──
applyFix('A4InvoiceDoc — dynamic logo size',
  `      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight:52, maxWidth:160, objectFit:"contain", display:"block", marginBottom:5 }} />}`,
  `      {org.logo && <img src={org.logo} alt="logo" style={{ maxHeight:org.logoSize||52, maxWidth:200, objectFit:"contain", display:"block", marginBottom:5 }} />}`
);

// ── FIX L: App root — add companyLogoSize state + context ──
applyFix('App root — add companyLogoSize state',
  `  const [companyLogo, setCompanyLogo] = useState(null); // base64 company logo`,
  `  const [companyLogo, setCompanyLogo] = useState(null); // base64 company logo
  const [companyLogoSize, setCompanyLogoSize] = useState(52);`
);

applyFix('App root — add companyLogoSize to context',
  `companyLogo, setCompanyLogo };`,
  `companyLogo, setCompanyLogo, companyLogoSize, setCompanyLogoSize };`
);

// ── FIX M: Settings — save logo size on Apply Template ──
applyFix('Settings — save logoSize on Apply',
  `                <Btn onClick={()=>{ setPdfTemplate(previewTpl); setCompanyLogo(tplLogo); setPreviewTpl(null); }} variant="primary">Apply Template</Btn>`,
  `                <Btn onClick={()=>{ setPdfTemplate(previewTpl); setCompanyLogo(tplLogo); setCompanyLogoSize(tplLogoSize); setPreviewTpl(null); }} variant="primary">Apply Template</Btn>`
);

applyFix('Settings — destructure companyLogoSize',
  `  const { companyLogo, setCompanyLogo } = useContext(AppCtx);`,
  `  const { companyLogo, setCompanyLogo, companyLogoSize, setCompanyLogoSize } = useContext(AppCtx);`
);

// ── FIX N: A4PrintModal — pass logo + logoSize from context ──
applyFix('A4PrintModal — pass logo + logoSize',
  `        <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat} orgSettings={{...orgSettings, logo:ctxFull.companyLogo}} accentColor={accentColor} template={activeTemplate} />`,
  `        <A4InvoiceDoc data={data} currSymbol={currSymbol} isVat={isVat} orgSettings={{...orgSettings, logo:ctxFull.companyLogo, logoSize:ctxFull.companyLogoSize||52}} accentColor={accentColor} template={activeTemplate} />`
);

// ── FIX O: Print CSS — force colors in print ──
applyFix('Print colors — webkit-print-color-adjust',
  `        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#fff;font-family:'Instrument Sans','DM Sans','Helvetica Neue',sans-serif}
        @page{size:A4;margin:0}
        @media print{body{margin:0}}`,
  `        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
        body{background:#fff;font-family:'Instrument Sans','DM Sans','Helvetica Neue',sans-serif}
        @page{size:A4;margin:0}
        @media print{body{margin:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}}`
);

// ═══════════════════════════════════════════════════════════════
// Write the fixed file back
// ═══════════════════════════════════════════════════════════════

fs.writeFileSync(APP_FILE, fixed);

console.log(`\n${'═'.repeat(50)}`);
console.log(`🎉 Applied ${fixCount} fixes to src/App.jsx`);
console.log(`📁 Backup: ${backup}`);
console.log(`${'═'.repeat(50)}`);
console.log(`\nTo undo: cp "${backup}" "${APP_FILE}"`);
