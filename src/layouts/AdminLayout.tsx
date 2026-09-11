import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { 
  LayoutDashboard, 
  ScanLine, 
  Users, 
  ClipboardCheck, 
  CalendarClock, 
  FileSpreadsheet, 
  ScrollText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Radio,
  ArrowUp
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari panel Admin?')) {
      await logout();
      navigate('/login');
    }
  };

  const handleScroll = () => {
    if (!mainContentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainContentRef.current;
    const totalHeight = scrollHeight - clientHeight;
    const progress = totalHeight > 0 ? (scrollTop / totalHeight) * 100 : 0;
    setScrollProgress(progress);
    setShowScrollTop(scrollTop > 180);
  };

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset scroll on navigation
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setScrollProgress(0);
    setShowScrollTop(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/scan', icon: ScanLine, label: 'Scan Siswa', badge: 'Ketua Kelas' },
    { to: '/admin/students', icon: Users, label: 'Data Siswa' },
    { to: '/admin/attendance', icon: ClipboardCheck, label: 'Data Absensi' },
    { to: '/admin/sessions', icon: CalendarClock, label: 'Sesi Absensi' },
    { to: '/admin/reports', icon: FileSpreadsheet, label: 'Laporan (Export)' },
    { to: '/admin/logs', icon: ScrollText, label: 'Activity Logs' },
    { to: '/admin/settings', icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <div className="h-screen h-[100dvh] w-full bg-slate-50 text-slate-900 flex relative overflow-hidden">
      <AnimatedBackground />

      {/* Desktop Sidebar (Fixed on the left - Never scrolls with main page) */}
      <aside className="hidden lg:flex lg:flex-col w-64 h-full bg-white/90 backdrop-blur-xl border-r border-slate-200/90 p-4 shrink-0 shadow-xs z-30 select-none">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-2 py-3 mb-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs overflow-hidden">
            <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-heading">PPLG 3</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 uppercase">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">SMKN 1 Ciomas</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-transparent pr-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 translate-x-1.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-1'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.nama || 'Admin'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@smkn1ciomas.sch.id'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Panel Admin</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer (Slide-Over Sidebar) */}
      <div 
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] h-full h-[100dvh] bg-white/98 backdrop-blur-md border-r border-slate-200 z-50 p-5 transform transition-transform duration-250 ease-out lg:hidden flex flex-col shadow-2xl will-change-transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
              <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-slate-900 font-heading">PPLG 3 ADMIN</p>
              <p className="text-xs text-slate-500 font-medium">SMKN 1 Ciomas</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-transparent">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              void handleLogout();
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Panel</span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrolls independently on right side only) */}
      <div 
        ref={mainContentRef}
        onScroll={handleScroll}
        className="flex-1 h-full flex flex-col min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-transparent relative z-10 overscroll-contain"
      >
        {/* Desktop Progress Bar (Invisible track, only shows glowing gradient when actively scrolling) */}
        {scrollProgress > 0 && (
          <div className="hidden lg:block sticky top-0 left-0 right-0 z-40 h-1 bg-transparent overflow-hidden pointer-events-none transition-opacity duration-300">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 transition-[width] duration-150 ease-out shadow-xs"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {/* Mobile Header Bar with Hamburger */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs relative">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer touch-press"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <img src="/logo-pplg3.png" alt="Logo XI PPLG 3" className="w-7 h-7 object-contain rounded-lg" />
              <span className="font-extrabold text-sm text-slate-900 font-heading">PPLG 3 ADMIN</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-600" />
              Sesi Aktif
            </span>
          </div>

          {/* Slim progress bar pinned to the bottom of the mobile header */}
          {scrollProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent overflow-hidden pointer-events-none">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 transition-[width] duration-150 ease-out"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
          )}
        </header>

        {/* Page Container */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden animate-page-enter pb-20 sm:pb-12">
          <Outlet />
        </main>

        {/* Floating Scroll To Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-blue-600/95 backdrop-blur-md text-white shadow-xl shadow-blue-600/30 hover:bg-blue-600 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer touch-press animate-page-enter"
            title="Kembali ke atas"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
