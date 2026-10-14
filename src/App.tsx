/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { DashboardPage } from './components/dashboard/DashboardPage.tsx';
import { MembersPage } from './components/members/MembersPage.tsx';
import { EventsPage } from './components/events/EventsPage.tsx';
import { AccreditationsPage } from './components/accreditations/AccreditationsPage.tsx';
import { ReportsPage } from './components/reports/ReportsPage.tsx';
import { UsersPage } from './components/users/UsersPage.tsx';
import { SettingsPage } from './components/settings/SettingsPage.tsx';
import { ToastContainer } from './components/common/Toast.tsx';
import { TestRunnerModal } from './components/tests/TestRunnerModal.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';

const AppContent: React.FC = () => {
  const { currentTab, isSidebarOpen, currentUser } = useApp();

  // If there is an auth token in the URL or no user is logged in, show AuthPage
  const urlParams = new URLSearchParams(window.location.search);
  const hasAuthToken = urlParams.has('verifyToken') || urlParams.has('resetToken');

  if (!currentUser || hasAuthToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <AuthPage />
        <ToastContainer />
      </div>
    );
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'members':
        return <MembersPage />;
      case 'events':
        return <EventsPage />;
      case 'accreditations':
        return <AccreditationsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* Collapsible Left Menu */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <ToastContainer />
      <TestRunnerModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
