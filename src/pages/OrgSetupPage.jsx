import { useState } from "react";
import { ff, INDUSTRIES, COUNTRIES, CURRENCIES_LIST, TIMEZONES, UK_COUNTIES, CIS_RATES } from "../constants";
import { Icons } from "../components/icons";
import { Field, Input, Select, Toggle, Switch, SlideToggle, Checkbox, InfoBox } from "../components/atoms";
import { validateVatNumber } from "../utils/helpers";

export default function OrgSetupPage({ onComplete, initialData }) {
  const [bType, setBType] = useState(initialData?.bType||"");
  const [orgName, setOrgName] = useState(initialData?.orgName||"");
  const [crn, setCrn] = useState(initialData?.crn||"");
  const [industry, setIndustry] = useState(initialData?.industry||"");
  const [country, setCountry] = useState(initialData?.country||"United Kingdom");
  const [state, setState] = useState(initialData?.state||"");
  const [showAddr, setShowAddr] = useState(false);
  const [street, setStreet] = useState(initialData?.street||"");
  const [city, setCity] = useState(initialData?.city||"");
  const [postcode, setPostcode] = useState(initialData?.postcode||"");
  const [currency, setCurrency] = useState(initialData?.currency||"GBP - British Pound Sterling");
  const [timezone, setTimezone] = useState(initialData?.timezone||"(UTC+00:00) London");
  const [vatReg, setVatReg] = useState(initialData?.vatReg==="Yes"||false);
  const [vatNum, setVatNum] = useState(initialData?.vatNum||"");
  const [vatNumTouched, setVatNumTouched] = useState(false);
  const [importExport, setImportExport] = useState(initialData?.importExport||false);
  const [flatRate, setFlatRate] = useState(initialData?.flatRate||false);
  const [flatRatePct, setFlatRatePct] = useState(initialData?.flatRatePct||"");
  const [cisReg, setCisReg] = useState(initialData?.cisReg==="Yes"||false);
  const [cisContractor, setCisContractor] = useState(initialData?.cisContractor||false);
  const [cisSub, setCisSub] = useState(initialData?.cisSub||false);
  const [cisRate, setCisRate] = useState(initialData?.cisRate||"20%");
  const [cisUtr, setCisUtr] = useState(initialData?.cisUtr||"");
  const [orgEmail, setOrgEmail] = useState(initialData?.email||"");
  const [orgPhone, setOrgPhone] = useState(initialData?.phone||"");
  const [deliversItems, setDeliversItems] = useState(initialData?.deliversItems !== false);

  const stateOpts = country==="United Kingdom" ? UK_COUNTIES : [];
  const isCIS = industry==="Construction";
  const vatNumError = vatReg && vatNumTouched && !validateVatNumber(vatNum)
    ? "Please enter a valid VAT number (e.g. GB123456789)" : null;
  const canSubmit = bType && orgName && industry && country &&
    (!vatReg || (vatReg && validateVatNumber(vatNum)));

  const handleComplete = () => {
    if(!canSubmit){ setVatNumTouched(true); return; }
    onComplete({ bType, orgName, crn, industry, country, state, street, city, postcode,
      currency, timezone, email:orgEmail, phone:orgPhone,
      deliversItems,
      vatReg: vatReg ? "Yes" : "No", vatNum, importExport, flatRate, flatRatePct,
      cisReg: cisReg ? "Yes" : "No", cisContractor, cisSub, cisRate, cisUtr });
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F7F7F5", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:ff }}>
      <div style={{ width:"100%", maxWidth:640, background:"#fff", borderRadius:16, boxShadow:"0 4px 40px rgba(0,0,0,0.08)", overflow:"hidden" }}>
        <div style={{ background:"#1A1A1A", padding:"28px 40px 24px", color:"#fff" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:32, height:32, background:"#E86C4A", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}><Icons.Building /></div>
            <span style={{ fontSize:15, fontWeight:700, letterSpacing:"0.04em" }}>AI INVOICE</span>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 4px" }}>Organization Setup</h1>
          <p style={{ fontSize:13, color:"#AAA", margin:0 }}>Welcome! Enter your details to get started.</p>
        </div>

        <div style={{ padding:"24px 40px 36px", overflowY:"auto", maxHeight:"75vh" }}>
          <Field label="Type of Business" required>
            <Toggle value={bType} onChange={setBType} options={["Sole Trader / Freelancer","Limited Company"]} />
          </Field>
          <Field label="Organization Name" required>
            <Input value={orgName} onChange={setOrgName} placeholder="e.g. Bright Studio Ltd" />
          </Field>
          {bType==="Limited Company" && (
            <Field label="Company Registration Number (CRN)" hint="Found on your Companies House certificate">
              <Input value={crn} onChange={setCrn} placeholder="e.g. 12345678" />
            </Field>
          )}
          <Field label="Industry" required>
            <Select value={industry} onChange={setIndustry} options={INDUSTRIES} placeholder="Select an industry…" />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Email Address"><Input value={orgEmail} onChange={setOrgEmail} type="email" placeholder="invoices@company.com" /></Field>
            <Field label="Phone Number"><Input value={orgPhone} onChange={setOrgPhone} placeholder="+44 20 7946 0000" /></Field>
          </div>

          {/* Address toggle */}
          <Field label="">
            <button onClick={()=>setShowAddr(!showAddr)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1.5px dashed #CCC", borderRadius:7, padding:"9px 14px", cursor:"pointer", color:"#555", fontSize:13, fontFamily:ff, width:"100%" }}>
              <span style={{ color:"#888" }}>{showAddr?<Icons.ChevDown />:<Icons.ChevRight />}</span>
              <span style={{ fontWeight:500 }}>Organisation Address</span>
              {(country||street||city) && <span style={{ fontSize:11, color:"#888", marginLeft:"auto" }}>{[street,city,country].filter(Boolean).join(", ").slice(0,40)}</span>}
            </button>
          </Field>
          {showAddr && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 2px", marginBottom:14, border:"1px solid #EBEBEB" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Country" required>
                  <Select value={country} onChange={v=>{ setCountry(v); setState(""); }} options={COUNTRIES} />
                </Field>
                <Field label="State / County">
                  {stateOpts.length>0
                    ? <Select value={state} onChange={setState} options={stateOpts} placeholder="Select…" />
                    : <Input value={state} onChange={setState} placeholder="Enter…" />}
                </Field>
              </div>
              <Field label="Street Address"><Input value={street} onChange={setStreet} placeholder="123 High Street" /></Field>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="City / Town"><Input value={city} onChange={setCity} /></Field>
                <Field label="Postcode / ZIP"><Input value={postcode} onChange={setPostcode} /></Field>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Currency" required><Select value={currency} onChange={setCurrency} options={CURRENCIES_LIST} /></Field>
            <Field label="Time Zone"><Select value={timezone} onChange={setTimezone} options={TIMEZONES} /></Field>
          </div>

          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB", marginTop:8, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>Do you deliver physical items?</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>If disabled, shipping fields stay optional and hidden by default.</div>
            </div>
            <SlideToggle value={deliversItems} onChange={setDeliversItems} />
          </div>

          {/* VAT */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB", marginBottom:4 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>VAT Registered</div>
              <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Are you registered to charge VAT?</div>
            </div>
            <SlideToggle value={vatReg} onChange={v=>{ setVatReg(v); setVatNumTouched(false); }} />
          </div>
          {vatReg && (
            <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 8px", marginBottom:14, border:"1px solid #EBEBEB" }}>
              <Field label="VAT Registration Number" required error={vatNumError}>
                <Input value={vatNum} onChange={v=>{ setVatNum(v); setVatNumTouched(true); }} placeholder="GB123456789" error={!!vatNumError} />
              </Field>
              {vatNum && validateVatNumber(vatNum) && (
                <div style={{ display:"flex", alignItems:"center", gap:6, color:"#16A34A", fontSize:12, fontWeight:600, marginBottom:10 }}>
                  <Icons.Check /> VAT number format valid
                </div>
              )}
              <Checkbox checked={importExport} onChange={setImportExport} label="I import/export goods and services from other countries" />
              <Checkbox checked={flatRate} onChange={setFlatRate} label="I've joined the VAT Flat Rate scheme" />
              {flatRate && <Field label="Flat Rate %"><Input value={flatRatePct} onChange={setFlatRatePct} type="number" placeholder="e.g. 12.5" /></Field>}
            </div>
          )}
          {!vatReg && <InfoBox color="#D97706">Items and invoices will not include VAT. You cannot legally charge VAT to customers until VAT registered.</InfoBox>}

          {/* CIS */}
          {isCIS && (
            <>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#F9F9F9", borderRadius:9, border:"1px solid #EBEBEB", marginTop:8, marginBottom:4 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1A1A" }}>CIS Registered</div>
                  <div style={{ fontSize:11, color:"#AAA", marginTop:1 }}>Construction Industry Scheme</div>
                </div>
                <SlideToggle value={cisReg} onChange={v=>setCisReg(v)} />
              </div>
              {cisReg && (
                <div style={{ background:"#F9F9F9", borderRadius:10, padding:"14px 14px 8px", marginBottom:14, border:"1px solid #EBEBEB" }}>
                  <Field label="UTR Number" hint="Unique Taxpayer Reference — 10 digits">
                    <Input value={cisUtr} onChange={setCisUtr} placeholder="e.g. 1234567890" />
                  </Field>
                  <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em", margin:"8px 0 10px" }}>CIS Role</div>
                  <Checkbox checked={cisContractor} onChange={setCisContractor} label="Contractor (I engage subcontractors)" />
                  <Checkbox checked={cisSub} onChange={setCisSub} label="Subcontractor (I work for contractors)" />
                  {cisSub && <Field label="CIS Deduction Rate"><Select value={cisRate} onChange={setCisRate} options={CIS_RATES} /></Field>}
                  <InfoBox>CIS deduction will be shown on invoices and automatically deducted from the total due.</InfoBox>
                </div>
              )}
            </>
          )}

          <button onClick={handleComplete} disabled={!canSubmit}
            style={{ width:"100%", padding:"13px 0", background:canSubmit?"#1A1A1A":"#CCC", color:"#fff", border:"none", borderRadius:9, fontSize:15, fontWeight:700, cursor:canSubmit?"pointer":"not-allowed", fontFamily:ff, marginTop:16, transition:"background 0.2s" }}
            onMouseEnter={e=>{ if(canSubmit) e.currentTarget.style.background="#E86C4A"; }}
            onMouseLeave={e=>{ if(canSubmit) e.currentTarget.style.background="#1A1A1A"; }}>
            Complete Setup →
          </button>
        </div>
      </div>
    </div>
  );
}
