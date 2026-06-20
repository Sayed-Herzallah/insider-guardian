import { useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Monitor,
  Search,
  BarChart3,
  Zap,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useData } from '@/context/DataContext';
import { getNavItemsForRole } from '@/config/navigation';
import gsap from 'gsap';
import type { NavItem, User } from '@/types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onLogout: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Bell,
  AlertTriangle,
  Monitor,
  Search,
  BarChart3,
  Zap,
  Settings,
  Sidebar: Monitor, // fallback
  // Add other icons if needed by nav config
};

interface NavContentProps {
  isMobile?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  logoRef?: React.RefObject<HTMLDivElement | null>;
  itemsRef?: React.RefObject<HTMLDivElement | null>;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: User | null;
  navItems: NavItem[];
}

const NavContent = ({
  isMobile = false,
  isCollapsed,
  onToggleCollapse,
  onCloseMobile,
  logoRef,
  itemsRef,
  currentPage,
  onNavigate,
  onLogout,
  user,
  navItems
}: NavContentProps) => (
  <>
    <div
      ref={isMobile ? null : logoRef}
      className={`flex items-center justify-between border-b border-[rgba(244,246,251,0.06)] ${isMobile ? 'h-16 px-4' : isCollapsed ? 'h-16 px-3' : 'h-20 px-5'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-xl bg-gradient-to-br from-[#00d4c3] to-[#00a896] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#00d4c3]/20 ${isMobile || !isCollapsed ? 'w-11 h-11' : 'w-10 h-10'
          }`}>
          <Shield className={`text-[#050505] ${isMobile || !isCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
        </div>
        {(isMobile || !isCollapsed) && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-[#f4f6fb] tracking-tight">Insider Guardian</h1>
            <p className="text-[10px] text-[#6b7280] uppercase tracking-widest">EDR Platform</p>
          </div>
        )}
      </div>
      {isMobile && (
        <button
          onClick={onCloseMobile}
          className="p-2 rounded-lg text-[#6b7280] hover:text-[#f4f6fb] hover:bg-[rgba(244,246,251,0.05)] transition-all"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {!isMobile && !isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#f4f6fb] hover:bg-[rgba(244,246,251,0.05)] transition-all hidden xl:block"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {!isMobile && isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#6b7280] hover:text-[#f4f6fb] hover:bg-[rgba(244,246,251,0.05)] transition-all hidden xl:block"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>

    <div ref={itemsRef} className={`flex-1 overflow-y-auto ${isMobile ? 'py-4 px-3' : isCollapsed ? 'py-4 px-2' : 'py-6 px-3'}`}>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || Monitor;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                nav-item w-full flex items-center rounded-xl
                transition-all duration-300 group relative overflow-hidden
                ${isMobile || !isCollapsed ? 'gap-3.5 px-4 py-3.5' : 'justify-center px-2 py-3'}
                ${isActive
                  ? 'bg-gradient-to-r from-[#00d4c3]/15 to-transparent text-[#00d4c3] border border-[#00d4c3]/30'
                  : 'text-[#6b7280] hover:bg-[rgba(244,246,251,0.04)] hover:text-[#f4f6fb] border border-transparent'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00d4c3] rounded-r-full" />
              )}
              <Icon className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isMobile || !isCollapsed ? 'w-5 h-5' : 'w-5 h-5'
                } ${isActive ? 'text-[#00d4c3]' : ''}`} />
              {(isMobile || !isCollapsed) && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isActive && (isMobile || !isCollapsed) && (
                <div className="ml-auto w-2 h-2 rounded-full bg-[#00d4c3] shadow-[0_0_8px_rgba(0,212,195,0.6)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>

    <div className={`border-t border-[rgba(244,246,251,0.06)] ${isMobile ? 'p-4' : isCollapsed ? 'p-3' : 'p-4'}`}>
      {user && (isMobile || !isCollapsed) && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-[rgba(0,212,195,0.08)] to-transparent border border-[rgba(0,212,195,0.15)]">
          <p className="text-[11px] text-[#6b7280] uppercase tracking-wider mb-1">Logged in as</p>
          <p className="text-sm font-semibold text-[#f4f6fb]">{user.name}</p>
          <p className="text-xs text-[#00d4c3] font-medium uppercase tracking-wider">{user.role}</p>
        </div>
      )}

      <button
        onClick={onLogout}
        className={`
          w-full flex items-center rounded-xl
          text-[#6b7280] hover:bg-[#ff3b30]/10 hover:text-[#ff3b30] hover:border-[#ff3b30]/30
          transition-all duration-300 border border-transparent group
          ${isMobile || !isCollapsed ? 'gap-3.5 px-4 py-3.5' : 'justify-center px-2 py-3'}
        `}
      >
        <LogOut className={`flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isMobile || !isCollapsed ? 'w-5 h-5' : 'w-5 h-5'
          }`} />
        {(isMobile || !isCollapsed) && <span className="text-sm font-medium">Logout</span>}
      </button>
    </div>
  </>
);

export default function Sidebar({
  currentPage,
  onNavigate,
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onLogout,
}: SidebarProps) {
  const { user } = useData();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  const navItems = user ? getNavItemsForRole(user.role) : [];

  useEffect(() => {
    if (itemsRef.current && !isCollapsed) {
      const items = itemsRef.current.querySelectorAll('.nav-item');
      gsap.fromTo(
        items,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out' }
      );
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (mobileSidebarRef.current && isMobileOpen) {
      gsap.fromTo(
        mobileSidebarRef.current,
        { x: '-100%' },
        { x: 0, duration: 0.3, ease: 'power3.out' }
      );
    }
  }, [isMobileOpen]);

  useEffect(() => {
    if (logoRef.current) {
      gsap.fromTo(
        logoRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const handleLogout = () => {
    if (window.innerWidth < 1024) {
      gsap.to(mobileSidebarRef.current, {
        x: '-100%',
        duration: 0.3,
        ease: 'power3.in',
        onComplete: onLogout,
      });
    } else {
      gsap.to(sidebarRef.current, {
        opacity: 0,
        x: -100,
        duration: 0.4,
        ease: 'power3.in',
        onComplete: onLogout,
      });
    }
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onCloseMobile();
  };

  const handleCloseMobile = () => {
    if (mobileSidebarRef.current) {
      gsap.to(mobileSidebarRef.current, {
        x: '-100%',
        duration: 0.3,
        ease: 'power3.in',
        onComplete: onCloseMobile,
      });
    } else {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => {
          gsap.fromTo(
            mobileSidebarRef.current,
            { x: '-100%' },
            { x: 0, duration: 0.3, ease: 'power3.out' }
          );
        }}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-xl bg-[#111318] border border-[rgba(244,246,251,0.12)] text-[#f4f6fb] hover:bg-[rgba(244,246,251,0.05)] transition-all shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          onClick={handleCloseMobile}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        ref={mobileSidebarRef}
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50
          w-[280px] max-w-[85vw]
          bg-gradient-to-b from-[#111318] to-[#0d0f12]
          border-r border-[rgba(244,246,251,0.08)]
          flex flex-col
          transform -translate-x-full
        `}
      >
        <NavContent
          isMobile
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          onCloseMobile={handleCloseMobile}
          logoRef={logoRef}
          itemsRef={itemsRef}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          user={user}
          navItems={navItems}
        />
      </div>

      {/* Desktop Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          hidden lg:flex flex-col
          bg-gradient-to-b from-[#111318] to-[#0d0f12]
          border-r border-[rgba(244,246,251,0.08)]
          transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          h-screen sticky top-0
          ${isCollapsed ? 'w-20' : 'w-64 xl:w-72'}
        `}
      >
        <NavContent
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          onCloseMobile={handleCloseMobile}
          logoRef={logoRef}
          itemsRef={itemsRef}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          user={user}
          navItems={navItems}
        />
      </div>
    </>
  );
}
