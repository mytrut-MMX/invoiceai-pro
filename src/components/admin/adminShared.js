const ff = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const s = {
  page: { minHeight:'100vh', background:'#F1F5F9', fontFamily:ff },
  loginWrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#0F172A,#1E3A5F)', padding:24 },
  loginCard: { background:'#fff', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  loginLogo: { textAlign:'center', marginBottom:28 },
  loginTitle: { fontSize:22, fontWeight:800, color:'#0F172A', textAlign:'center', marginBottom:6 },
  loginSub: { fontSize:14, color:'#64748B', textAlign:'center', marginBottom:28 },
  label: { display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 },
  input: { width:'100%', padding:'11px 14px', border:'1.5px solid #E2E8F0', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:ff },
  btn: { width:'100%', padding:'12px', background:'#0F172A', color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', marginTop:8 },
  btnSm: { padding:'6px 14px', background:'#0EA5E9', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  btnDanger: { padding:'6px 14px', background:'#EF4444', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer' },
  err: { background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:12 },
  header: { background:'#0F172A', padding:'0 32px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' },
  headerLogo: { fontSize:18, fontWeight:800, color:'#fff', letterSpacing:-0.5 },
  headerAccent: { color:'#0EA5E9' },
  headerRight: { display:'flex', alignItems:'center', gap:12 },
  main: { maxWidth:1280, margin:'0 auto', padding:'24px' },
  adminLayout: { display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' },
  sidebar: { width:240, flex:'0 0 240px', background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:14, position:'sticky', top:16 },
  sidebarTitle: { fontSize:12, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:0.7, margin:'4px 8px 10px' },
  sidebarNav: { display:'grid', gap:6 },
  sidebarItem: { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', border:'1px solid transparent', background:'transparent', color:'#334155', borderRadius:10, padding:'10px 12px', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:ff, textAlign:'left' },
  sidebarItemActive: { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', border:'1px solid #BFDBFE', background:'#EFF6FF', color:'#1E3A8A', borderRadius:10, padding:'10px 12px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:ff, textAlign:'left' },
  sidebarBadge: { display:'inline-flex', minWidth:22, height:22, borderRadius:999, alignItems:'center', justifyContent:'center', fontSize:11, padding:'0 6px', background:'#E2E8F0', color:'#475569' },
  sidebarBadgeActive: { display:'inline-flex', minWidth:22, height:22, borderRadius:999, alignItems:'center', justifyContent:'center', fontSize:11, padding:'0 6px', background:'#DBEAFE', color:'#1E3A8A' },
  adminContent: { flex:'1 1 760px', minWidth:0 },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:32 },
  statCard: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'20px 24px' },
  statNum: { fontSize:32, fontWeight:800, color:'#0F172A', lineHeight:1.1 },
  statLabel: { fontSize:13, color:'#64748B', marginTop:4 },
  statDot: { width:10, height:10, borderRadius:'50%', display:'inline-block', marginRight:6 },
  tabs: { display:'flex', gap:4, marginBottom:24, background:'#E2E8F0', borderRadius:10, padding:4, width:'fit-content' },
  tab: { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'transparent', color:'#64748B', fontFamily:ff },
  tabActive: { padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer', border:'none', background:'#fff', color:'#0F172A', fontFamily:ff, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' },
  tableWrap: { background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' },
  tableHead: { background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', padding:'12px 20px', display:'grid', gap:12 },
  tableRow: { padding:'14px 20px', display:'grid', gap:12, borderBottom:'1px solid #F1F5F9', alignItems:'center' },
  tableCell: { fontSize:13, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  tableCellHead: { fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5 },
  badge: { display:'inline-block', padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600 },
  emptyState: { padding:'48px 24px', textAlign:'center', color:'#9CA3AF', fontSize:14 },
  msgBox: { background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#374151', whiteSpace:'pre-wrap', wordBreak:'break-word', lineHeight:1.6, maxHeight:100, overflow:'auto' },
  sectionTitle: { fontSize:18, fontWeight:700, color:'#0F172A', marginBottom:16 },
  pill: { display:'inline-block', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#DBEAFE', color:'#1E40AF' },
  refreshBtn: { padding:'8px 18px', background:'#F1F5F9', color:'#374151', border:'1px solid #E2E8F0', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:ff },
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function todayCount(arr) {
  const today = new Date().toDateString();
  return arr.filter(x => x.created_at && new Date(x.created_at).toDateString() === today).length;
}

export { ff, s, fmt, fmtDate, todayCount };
