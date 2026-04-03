import { s } from './adminShared';

export default function AdminLogin({
  error,
  handleLogin,
  pw,
  setPw,
  show,
  setShow,
  checking,
  clearError,
}) {
  return (
    <div style={s.loginWrap}>
      <div style={s.loginCard}>
        <div style={s.loginLogo}>
          <div style={{ fontSize:36, marginBottom:8 }}>🛡️</div>
        </div>
        <div style={s.loginTitle}>Admin Access</div>
        <div style={s.loginSub}>InvoiceSaga Control Panel</div>

        <form onSubmit={handleLogin}>
          {error && <div style={s.err}>{error}</div>}
          <div style={{ marginBottom:16 }}>
            <label style={s.label}>Admin Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={e => {
                  setPw(e.target.value);
                  clearError();
                }}
                placeholder="Enter admin password"
                style={{ ...s.input, paddingRight:44 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(p => !p)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', fontSize:16, padding:4 }}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={checking} style={{ ...s.btn, opacity: checking ? 0.7 : 1 }}>{checking ? 'Verifying…' : 'Enter Admin Panel →'}</button>
        </form>

        <div style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#9CA3AF' }}>
          <a href="/" style={{ color:'#64748B', textDecoration:'none' }}>← Back to InvoiceSaga</a>
        </div>
      </div>
    </div>
  );
}
