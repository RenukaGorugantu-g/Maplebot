import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SearchModal } from '../ui/SearchModal';
import { ToastContainer } from '../ui/Toast';

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  selectedPodId?: string;
  onSelectPodId?: (id: string | undefined) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  selectedPodId,
  onSelectPodId,
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex selection:bg-maple-500/30">
      {/* Sidebar Navigation (Sticky on desktop) */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main App Content Area (No extra margin-left) */}
      <div className="flex-1 flex flex-col transition-all duration-300 min-w-0">
        <Header
          currentPath={currentPath}
          onNavigate={onNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          selectedPodId={selectedPodId}
          onSelectPodId={onSelectPodId}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto pb-24">
          {children}
        </main>
      </div>

      {/* Global Search & Notifications */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={onNavigate}
      />
      <ToastContainer />
    </div>
  );
};
