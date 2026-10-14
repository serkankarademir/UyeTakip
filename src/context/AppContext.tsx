import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.ts';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AppContextType {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  logout: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectedMemberId: number | null;
  setSelectedMemberId: (id: number | null) => void;
  selectedEventId: number | null;
  setSelectedEventId: (id: number | null) => void;
  isTestModalOpen: boolean;
  setIsTestModalOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bursa_akub_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('bursa_akub_user');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role || 'ADMIN';
      }
    } catch {}
    return 'ADMIN';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      setCurrentUserRole(currentUser.role);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('bursa_akub_user', JSON.stringify(user));
      setCurrentUserRole(user.role);
    } else {
      localStorage.removeItem('bursa_akub_user');
    }
  };

  const logout = () => {
    handleSetCurrentUser(null);
    showToast('Oturum kapatıldı.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        currentUserRole,
        setCurrentUserRole,
        logout,
        isDarkMode,
        setIsDarkMode,
        toggleDarkMode,
        toasts,
        showToast,
        removeToast,
        refreshTrigger,
        triggerRefresh,
        isSidebarOpen,
        setIsSidebarOpen,
        selectedMemberId,
        setSelectedMemberId,
        selectedEventId,
        setSelectedEventId,
        isTestModalOpen,
        setIsTestModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
