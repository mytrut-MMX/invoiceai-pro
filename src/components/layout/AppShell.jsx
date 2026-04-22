import { Suspense, useContext, useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppCtx } from "../../context/AppContext";
import { ROUTES } from "../../router/routes";
import { TopBar, Sidebar, MobileTopBar, MobileBottomNav, MobileDrawer, hasActiveIssuedSbaFromCtx } from ".";
import UserEditModal from "../../modals/UserEditModal";
import CommandPalette from "../CommandPalette";
import { ToastProvider } from "../ui/Toast";
import { signOut } from "../../lib/supabase";
import { ListSkeleton } from "../ui/Skeleton";
import { useInactivityTimer } from "../../hooks/useInactivityTimer";

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export default function AppShell() {
  const ctx = useContext(AppCtx);
  const { user, setUser, appTheme, setAppTheme } = ctx;
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => lsGet("invoicesaga_sidebar_collapsed", false));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showUserModal,    setShowUserModal]    = useState(false);
  const [storageError,     setStorageError]     = useState(null);
  const [paletteOpen,      setPaletteOpen]      = useState(false);

  const [userAvatar,    setUserAvatar]    = useState(() => lsGet("ai_invoice_avatar", null));
  const [sidebarPinned, setSidebarPinned] = useState(() => lsGet("ai_invoice_sidebar_pinned", true));

  useEffect(() => {
    try { localStorage.setItem("ai_invoice_avatar", JSON.stringify(userAvatar)); } catch {}
  }, [userAvatar]);

  useEffect(() => {
    try { localStorage.setItem("ai_invoice_sidebar_pinned", JSON.stringify(sidebarPinned)); } catch {}
  }, [sidebarPinned]);

  useEffect(() => {
    try { localStorage.setItem("invoicesaga_sidebar_collapsed", JSON.stringify(sidebarCollapsed)); } catch {}
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handler = (e) =>
      setStorageError(`Storage full — data may not be saved (${e.detail.keys.length} key(s) failed).`);
    window.addEventListener("storage-error", handler);
    return () => window.removeEventListener("storage-error", handler);
  }, []);

  // Global keyboard shortcuts:
  //   ⌘K / Ctrl+K        → toggle command palette
  //   ⌘⇧S / Ctrl+Shift+S → jump to the self-bill flow (gated on active SBA)
  const hasActiveSba = hasActiveIssuedSbaFromCtx(ctx);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      } else if ((e.key === "s" || e.key === "S") && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        if (!hasActiveSba) return;
        e.preventDefault();
        navigate("/bills?mode=selfbill");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasActiveSba, navigate]);

  const { inactive: showInactivityPrompt, dismiss: dismissInactivityPrompt } = useInactivityTimer();

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
    <ToastProvider>
      {/* ── Banners (fixed, above everything) ── */}
      {storageError && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 bg-red-900 text-red-200 text-[13px] font-semibold px-4 py-2.5">
          <span>⚠ {storageError}</span>
          <button
            onClick={() => setStorageError(null)}
            className="bg-transparent border-none text-red-400 cursor-pointer text-lg leading-none p-0"
          >
            ×
          </button>
        </div>
      )}

      {showInactivityPrompt && (
        <div
          className="fixed left-0 right-0 z-[9998] flex items-center justify-between gap-3 bg-amber-900 text-amber-100 text-[13px] font-semibold px-4 py-2.5"
          style={{ top: storageError ? 44 : 0 }}
        >
          <span>Still there? You've been inactive for a while.</span>
          <button
            onClick={() => { extendSession(); dismissInactivityPrompt(); }}
            className="bg-amber-100 text-amber-900 border-none rounded-[var(--radius-md)] px-3 py-1 text-[12px] font-bold cursor-pointer"
          >
            Stay logged in
          </button>
        </div>
      )}

      {/* ── Desktop layout (lg+) ── */}
      <div className="hidden lg:flex flex-col h-screen overflow-hidden bg-[var(--surface-page)]">
        <TopBar
          user={user}
          userAvatar={userAvatar}
          onUserClick={() => setShowUserModal(true)}
          onLogout={doLogout}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onMenuOpen={() => setMobileDrawerOpen(true)}
          onSearchClick={() => setPaletteOpen(true)}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
          <main className="flex-1 overflow-y-auto">
            <Suspense fallback={<ListSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>

      {/* ── Mobile layout (< lg) ── */}
      <div className="flex lg:hidden flex-col h-screen overflow-hidden bg-[var(--surface-page)]">
        <MobileTopBar
          onMenuOpen={() => setMobileDrawerOpen(true)}
          user={user}
          userAvatar={userAvatar}
          onUserClick={() => setShowUserModal(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<ListSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileBottomNav />
      </div>

      {/* ── Mobile drawer ── */}
      {mobileDrawerOpen && (
        <MobileDrawer
          onClose={() => setMobileDrawerOpen(false)}
          user={user}
          userAvatar={userAvatar}
          onUserClick={() => { setShowUserModal(true); setMobileDrawerOpen(false); }}
          onLogout={doLogout}
        />
      )}

      {/* ── Command palette ── */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── User edit modal ── */}
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
    </ToastProvider>
  );
}
