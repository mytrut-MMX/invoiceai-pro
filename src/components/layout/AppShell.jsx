import { Suspense, useContext, useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { ROUTES } from "../../router/routes";
import { Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer } from ".";
import UserEditModal from "../../modals/UserEditModal";
import { signOut } from "../../lib/supabase";
import { ff } from "../../constants";
import PageLoader from "../ui/PageLoader";

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Layout wrapper for all authenticated app pages.
 * Provides the sidebar, mobile top bar, mobile bottom nav, mobile drawer,
 * and the user-edit modal. Renders page content via <Outlet />.
 *
 * Reads appTheme and user from AppCtx; all sidebar UI state is local.
 */
export default function AppShell() {
  const { user, setUser, appTheme, setAppTheme } = useContext(AppCtx);
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showUserModal,    setShowUserModal]    = useState(false);
  const [storageError,     setStorageError]     = useState(null);

  const [userAvatar,    setUserAvatar]    = useState(() => lsGet("ai_invoice_avatar", null));
  const [sidebarPinned, setSidebarPinned] = useState(() => lsGet("ai_invoice_sidebar_pinned", true));

  useEffect(() => {
    try { localStorage.setItem("ai_invoice_avatar", JSON.stringify(userAvatar)); } catch {}
  }, [userAvatar]);

  useEffect(() => {
    try { localStorage.setItem("ai_invoice_sidebar_pinned", JSON.stringify(sidebarPinned)); } catch {}
  }, [sidebarPinned]);

  useEffect(() => {
    const handler = (e) =>
      setStorageError(`Storage full — data may not be saved (${e.detail.keys.length} key(s) failed).`);
    window.addEventListener("storage-error", handler);
    return () => window.removeEventListener("storage-error", handler);
  }, []);

  const sessionExpiringSoon =
    user?.expiresAt &&
    user.expiresAt - Date.now() < 30 * 60 * 1000 &&
    Date.now() < user.expiresAt;

  const sidebarBg =
    appTheme.type === "gradient"
      ? `linear-gradient(160deg,${appTheme.color},${appTheme.color2})`
      : appTheme.color;

  const doLogout = useCallback(async () => {
    try { await signOut(); } catch {}
    localStorage.removeItem("ai_invoice_user");
    setUser(null);
    navigate(ROUTES.LANDING);
  }, [navigate, setUser]);

  const extendSession = useCallback(() => {
    setUser(prev => {
      const updated = { ...prev, expiresAt: Date.now() + 8 * 60 * 60 * 1000 };
      try { localStorage.setItem("ai_invoice_user", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [setUser]);

  return (
    <>
      {storageError && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#7F1D1D", color: "#FEE2E2", fontSize: 13, fontWeight: 600, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: ff }}>
          <span>⚠ {storageError}</span>
          <button onClick={() => setStorageError(null)} style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {sessionExpiringSoon && (
        <div style={{ position: "fixed", top: storageError ? 44 : 0, left: 0, right: 0, zIndex: 9998, background: "#78350F", color: "#FEF3C7", fontSize: 13, fontWeight: 600, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: ff }}>
          <span>⚠ Your session expires soon. Save your work.</span>
          <button onClick={extendSession} style={{ background: "#FEF3C7", color: "#78350F", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Stay logged in</button>
        </div>
      )}

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: ff, background: "#f4f5f7" }}>
        <div className="desktop-only">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            accent={appTheme.accent}
            sidebarBg={sidebarBg}
            user={user}
            userAvatar={userAvatar}
            onUserClick={() => setShowUserModal(true)}
            onLogout={doLogout}
          />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, background: "#fff", borderBottom: "1px solid #e8e8ec" }}>
          <div className="mobile-only">
            <MobileTopBar
              onMenuOpen={() => setMobileDrawerOpen(true)}
              sidebarBg={sidebarBg}
              accent={appTheme.accent}
              user={user}
              userAvatar={userAvatar}
              onUserClick={() => setShowUserModal(true)}
            />
            <div style={{ height: 52 }} />
          </div>

          <main className="main-content" style={{ flex: 1, overflowY: "auto" }}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </main>

          <div className="mobile-only">
            <MobileBottomNav accent={appTheme.accent} />
            <div style={{ height: 60 }} />
          </div>
        </div>

        {mobileDrawerOpen && (
          <MobileDrawer
            onClose={() => setMobileDrawerOpen(false)}
            sidebarBg={sidebarBg}
            accent={appTheme.accent}
            user={user}
            userAvatar={userAvatar}
            onUserClick={() => { setShowUserModal(true); setMobileDrawerOpen(false); }}
            onLogout={doLogout}
          />
        )}

        {showUserModal && (
          <UserEditModal
            user={user}
            onClose={() => setShowUserModal(false)}
            onSave={u => setUser(prev => ({ ...prev, ...u }))}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            sidebarPinned={sidebarPinned}
            setSidebarPinned={setSidebarPinned}
            onLogout={doLogout}
          />
        )}
      </div>
    </>
  );
}
