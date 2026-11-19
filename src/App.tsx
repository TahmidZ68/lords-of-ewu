import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { LordsCupPage } from '@/pages/LordsCupPage';
import { LordsCupHistoryPage } from '@/pages/LordsCupHistoryPage';
import { SeasonDetailPage } from '@/pages/SeasonDetailPage';
import { FixturesPage } from '@/pages/FixturesPage';
import { HallOfFamePage } from '@/pages/HallOfFamePage';
import { GalleryPage } from '@/pages/GalleryPage';
import { PlayersPage } from '@/pages/PlayersPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { JoinUsPage } from '@/pages/JoinUsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RegistrationStatusPage } from '@/pages/RegistrationStatusPage';
import { LiveDrawDisplayPage } from '@/pages/LiveDrawDisplayPage';

import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { AdminSeasonsPage } from '@/pages/admin/AdminSeasonsPage';
import { AdminRegistrationsPage } from '@/pages/admin/AdminRegistrationsPage';
import { AdminPaymentsPage } from '@/pages/admin/AdminPaymentsPage';
import { AdminMembersPage } from '@/pages/admin/AdminMembersPage';
import { AdminTeamsPage } from '@/pages/admin/AdminTeamsPage';
import { AdminLiveDrawPage } from '@/pages/admin/AdminLiveDrawPage';
import { AdminPlotDraftPage } from '@/pages/admin/AdminPlotDraftPage';
import { AdminMatchesPage } from '@/pages/admin/AdminMatchesPage';
import {
  AdminAnnouncementsPage,
  AdminAwardsPage,
  AdminGalleryPage,
} from '@/pages/admin/AdminContentModulesPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import {
  AdminAdministratorsPage,
  AdminAuditLogsPage,
} from '@/pages/admin/AdminSystemPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Website */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/lords-cup" element={<LordsCupPage />} />
                <Route path="/lords-cup/history" element={<LordsCupHistoryPage />} />
                <Route path="/lords-cup/:seasonSlug" element={<SeasonDetailPage />} />
                <Route path="/fixtures" element={<FixturesPage />} />
                <Route path="/hall-of-fame" element={<HallOfFamePage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/join-us" element={<JoinUsPage />} />
                <Route path="/register" element={<Navigate to="/join-us" replace />} />
                <Route path="/registration-status" element={<RegistrationStatusPage />} />
              </Route>

              {/* Public Live Draw Projection Display */}
              <Route path="/lords-cup/draw" element={<LiveDrawDisplayPage />} />

              {/* Protected Admin Routes */}
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverviewPage />} />
                <Route path="settings" element={<AdminSettingsPage defaultTab="org" />} />
                <Route path="content" element={<AdminSettingsPage defaultTab="cms" />} />
                <Route path="seasons" element={<AdminSeasonsPage />} />
                <Route path="registrations" element={<AdminRegistrationsPage />} />
                <Route path="payments" element={<AdminPaymentsPage />} />
                <Route path="members" element={<AdminMembersPage leadershipOnly={false} />} />
                <Route path="teams" element={<AdminTeamsPage />} />
                <Route path="live-draw" element={<AdminLiveDrawPage />} />
                <Route path="plot-draft" element={<AdminPlotDraftPage />} />
                <Route path="fixtures" element={<AdminMatchesPage mode="fixtures" />} />
                <Route path="results" element={<AdminMatchesPage mode="results" />} />
                <Route path="standings" element={<AdminMatchesPage mode="standings" />} />
                <Route path="awards" element={<AdminAwardsPage />} />
                <Route path="announcements" element={<AdminAnnouncementsPage />} />
                <Route path="gallery" element={<AdminGalleryPage />} />
                <Route path="leadership" element={<AdminMembersPage leadershipOnly={true} />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="administrators" element={<AdminAdministratorsPage />} />
                <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
