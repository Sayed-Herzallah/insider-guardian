import { useState, useEffect, useRef, useCallback } from 'react';
import { DataProvider, useData } from '@/context/DataContext';
import Sidebar from '@/components/Sidebar';
import { getNavItemsForRole } from '@/config/navigation';
import Toast from '@/components/Toast';
import Login from '@/pages/Login';
import Overview from '@/pages/Overview';
import Alerts from '@/pages/Alerts';
import Incidents from '@/pages/Incidents';
import Endpoints from '@/pages/Endpoints';
import Investigation from '@/pages/Investigation';
import Analytics from '@/pages/Analytics';
import Automation from '@/pages/Automation';
import Administration from '@/pages/Administration';
import Profile from '@/pages/Profile';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type PageType =
  | 'overview'
  | 'alerts'
  | 'incidents'
  | 'endpoints'
  | 'investigation'
  | 'analytics'
  | 'automation'
  | 'administration'
  | 'profile';

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { user } = useData();
  const [currentPage, setCurrentPage] = useState<PageType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setSidebarCollapsed(false);
      } else {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [currentPage]);

  useEffect(() => {
    if (dashboardRef.current) {
      gsap.fromTo(
        dashboardRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  const handleThreatDetected = () => {
    setToast('Malware Detected! View in Alerts.');
  };

  const handleLogout = useCallback(() => {
    gsap.to(dashboardRef.current, {
      opacity: 0,
      scale: 0.98,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: onLogout,
    });
  }, [onLogout]);

  const renderPage = () => {
    // Check if user has permission to access the current page
    const allowedItems = user ? getNavItemsForRole(user.role) : [];
    const isAllowed = allowedItems.some((item) => item.id === currentPage);

    if (!isAllowed && currentPage !== 'profile') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-[#a6acb8] text-sm max-w-md mb-6">
            You do not have the required permissions to view the <span className="text-[#00d4c3] font-semibold font-mono">"{currentPage}"</span> page.
          </p>
          <button
            onClick={() => setCurrentPage('overview')}
            className="px-5 py-2.5 bg-gradient-to-r from-[#00d4c3] to-[#00a896] text-[#050505] font-semibold rounded-xl text-sm shadow-lg shadow-[#00d4c3]/20 hover:shadow-xl hover:shadow-[#00d4c3]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Return to Overview
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'overview':
        return <Overview onThreatDetected={handleThreatDetected} />;
      case 'alerts':
        return <Alerts />;
      case 'incidents':
        return <Incidents />;
      case 'endpoints':
        return <Endpoints />;
      case 'investigation':
        return <Investigation />;
      case 'analytics':
        return <Analytics />;
      case 'automation':
        return <Automation />;
      case 'administration':
        return <Administration />;
      case 'profile':
        return <Profile />;
      default:
        return <Overview onThreatDetected={handleThreatDetected} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'overview':
        return 'Overview';
      case 'alerts':
        return 'Alerts';
      case 'incidents':
        return 'Incidents';
      case 'endpoints':
        return 'Endpoints';
      case 'investigation':
        return 'Investigation';
      case 'analytics':
        return 'Analytics & Reports';
      case 'automation':
        return 'Automation';
      case 'administration':
        return 'Administration';
      case 'profile':
        return 'My Profile';
      default:
        return 'Overview';
    }
  };

  return (
    <div ref={dashboardRef} className="min-h-screen bg-[#050505] flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page as PageType)}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden w-full">
        <header className="h-14 sm:h-16 bg-[#111318]/90 backdrop-blur-md border-b border-[rgba(244,246,251,0.08)] flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg bg-[rgba(244,246,251,0.05)] text-[#a6acb8] hover:text-[#f4f6fb] hover:bg-[rgba(244,246,251,0.1)] transition-all"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-semibold text-[#f4f6fb] truncate">{getPageTitle()}</h1>
              <p className="text-[10px] sm:text-xs text-[#6b7280] hidden sm:block">Welcome back, {user?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,212,195,0.1)] border border-[rgba(0,212,195,0.2)]">
              <div className="w-2 h-2 rounded-full bg-[#00d4c3] animate-pulse" />
              <span className="text-xs text-[#00d4c3]">System Operational</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button className="relative p-2 rounded-lg hover:bg-[rgba(244,246,251,0.05)] text-[#a6acb8] hover:text-[#f4f6fb] transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff3b30] animate-pulse" />
              </button>

              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-[rgba(244,246,251,0.08)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4c3] to-[#00a896] flex items-center justify-center ring-2 ring-[#00d4c3]/20 flex-shrink-0">
                  <span className="text-sm font-bold text-[#050505]">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-[#f4f6fb]">{user?.name}</p>
                  <p className="text-xs text-[#00d4c3] uppercase tracking-wider">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main ref={contentRef} className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function AppContent() {
  const { user } = useData();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
