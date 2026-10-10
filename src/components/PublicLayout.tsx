import { Outlet } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import CategorySidebar from './CategorySidebar';
import SitePopup from './SitePopup';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';

export default function PublicLayout() {
  const { settings } = useSettings();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    if (loading) return;
    if (settings?.maintenance_enabled && !isAdmin) {
      navigate('/maintenance', { replace: true });
    }
    setMaintenanceChecked(true);
  }, [settings, isAdmin, loading, navigate]);

  if (!maintenanceChecked && settings?.maintenance_enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-aqua border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar onMenuClick={openSidebar} />
      <CategorySidebar open={sidebarOpen} onClose={closeSidebar} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer footerText={settings?.footer_text} />
      <SitePopup />
    </div>
  );
}
