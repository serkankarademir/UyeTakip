import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { UserRole } from '../../types/index.ts';
import {
  Menu,
  Sun,
  Moon,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Eye,
  ShieldAlert,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentTab,
    isSidebarOpen,
    setIsSidebarOpen,
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    logout,
    isDarkMode,
    toggleDarkMode,
    triggerRefresh,
    showToast,
  } = useApp();

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Genel Bakış & Durum Özeti';
      case 'members':
        return 'Ekip Üyeleri Yönetimi';
      case 'events':
        return 'Operasyon, Tatbikat ve Eğitimler';
      case 'accreditations':
        return 'Akreditasyonlar ve Yeterlilikler';
      case 'reports':
        return 'Raporlar ve Envanter Analizi';
      case 'users':
        return 'Kullanıcılar, Yetkiler ve Denetim Kayıtları';
      case 'settings':
        return 'Sistem Ayarları ve Yapılandırma';
      default:
        return 'Ekip Yönetim Sistemi';
    }
  };

  const roles: { role: UserRole; label: string; icon: any; color: string }[] = [
    { role: 'ADMIN', label: 'Sistem Yöneticisi', icon: ShieldCheck, color: 'text-rose-500' },
    { role: 'MEMBER_MANAGER', label: 'Üye Yöneticisi', icon: UserCheck, color: 'text-blue-500' },
    { role: 'VIEWER', label: 'Sınırlı Görüntüleyici', icon: Eye, color: 'text-amber-500' },
  ];

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger, Bursa MEB AKUB tag & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            title="Menü"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-rose-600 text-white shadow-xs">
                Bursa MEB AKUB
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {getPageTitle(currentTab)}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Bursa MEB AKUB – Üye ve Etkinlik Takip Sistemi
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Role Selector (RBAC switcher for demonstration and permissions testing) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold px-2 text-slate-500 dark:text-slate-400 hidden md:inline">
              Aktif Rol:
            </span>
            <select
              value={currentUserRole}
              onChange={(e) => {
                const next = e.target.value as UserRole;
                setCurrentUserRole(next);
                showToast(`Rol değiştirildi: ${roles.find((r) => r.role === next)?.label}`, 'info');
              }}
              className="text-xs font-medium bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer py-1 px-1.5 rounded"
            >
              {roles.map((r) => (
                <option key={r.role} value={r.role} className="bg-white dark:bg-slate-800">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => {
              triggerRefresh();
              showToast('Veriler yenilendi', 'info');
            }}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isDarkMode ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* User profile & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1.5 text-xs font-medium"
                title="Oturumu Kapat"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Çıkış Yap</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
