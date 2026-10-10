import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { SettingsProvider } from '@/context/SettingsContext';
import PublicLayout from '@/components/PublicLayout';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/components/AdminLayout';

import HomePage from '@/pages/HomePage';
import GamesPage from '@/pages/GamesPage';
import CategoryPage from '@/pages/CategoryPage';
import CategoriesPage from '@/pages/CategoriesPage';
import GamePage from '@/pages/GamePage';
import SearchPage from '@/pages/SearchPage';
import PopularPage from '@/pages/PopularPage';
import NewGamesPage from '@/pages/NewGamesPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfileEditPage from '@/pages/ProfileEditPage';
import NotFoundPage from '@/pages/NotFoundPage';
import MaintenancePage from '@/pages/MaintenancePage';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminGames from '@/pages/admin/AdminGames';
import AdminImportGames from '@/pages/admin/AdminImportGames';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminFeatured from '@/pages/admin/AdminFeatured';
import AdminLeaderboard from '@/pages/admin/AdminLeaderboard';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminReports from '@/pages/admin/AdminReports';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminPages from '@/pages/admin/AdminPages';
import CustomPageView from '@/pages/CustomPageView';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/game/:slug" element={<GamePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/popular" element={<PopularPage />} />
                <Route path="/new" element={<NewGamesPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<ProfileEditPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/p/:slug" element={<CustomPageView />} />
              </Route>

              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              <Route path="/admin" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
              <Route path="/admin/games" element={<AdminRoute><AdminLayout><AdminGames /></AdminLayout></AdminRoute>} />
              <Route path="/admin/import-games" element={<AdminRoute><AdminLayout><AdminImportGames /></AdminLayout></AdminRoute>} />
              <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategories /></AdminLayout></AdminRoute>} />
              <Route path="/admin/featured" element={<AdminRoute><AdminLayout><AdminFeatured /></AdminLayout></AdminRoute>} />
              <Route path="/admin/leaderboard" element={<AdminRoute><AdminLayout><AdminLeaderboard /></AdminLayout></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AdminSettings /></AdminLayout></AdminRoute>} />
              <Route path="/admin/analytics" element={<AdminRoute><AdminLayout><AdminAnalytics /></AdminLayout></AdminRoute>} />
              <Route path="/admin/reports" element={<AdminRoute><AdminLayout><AdminReports /></AdminLayout></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminLayout><AdminUsers /></AdminLayout></AdminRoute>} />
              <Route path="/admin/pages" element={<AdminRoute><AdminLayout><AdminPages /></AdminLayout></AdminRoute>} />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
