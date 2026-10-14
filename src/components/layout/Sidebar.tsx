import React from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Award,
  BarChart3,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  TestTube2,
  LogOut,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    isSidebarOpen,
    setIsSidebarOpen,
    setIsTestModalOpen,
    currentUser,
    logout,
  } = useApp();

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Ana Sayfa', icon: LayoutDashboard },
    { id: 'members', label: 'Üyeler', icon: Users },
    { id: 'events', label: 'Etkinlikler', icon: CalendarCheck2 },
    { id: 'accreditations', label: 'Eğitimler ve Akreditasyonlar', icon: Award },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'users', label: 'Kullanıcılar ve Yetkiler', icon: ShieldCheck },
    { id: 'settings', label: 'Sistem Ayarları', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 border-r border-slate-800 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-900/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-white truncate">
                  Bursa MEB AKUB
                </span>
                <span className="text-[11px] text-amber-400 font-medium truncate">
                  Üye ve Etkinlik Takip
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isSidebarOpen ? 'Menüyü Daralt' : 'Menüyü Genişlet'}
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={!isSidebarOpen ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Automated Tests trigger & System info in footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={() => setIsTestModalOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition"
            title="Otomatik Testler (10 Senaryo)"
          >
            <TestTube2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            {isSidebarOpen && <span>Otomatik Testleri Çalıştır</span>}
          </button>

          {isSidebarOpen && (
            <div className="px-2 pt-1 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Bursa MEB AKUB</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          )}

          {currentUser && isSidebarOpen && (
            <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-800 text-xs">
              <div className="truncate min-w-0 pr-2">
                <p className="font-semibold text-slate-200 truncate">{currentUser.displayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded-lg transition"
                title="Çıkış Yap"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
