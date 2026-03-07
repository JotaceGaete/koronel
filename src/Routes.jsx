import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import FloatingActionButton from "components/ui/FloatingActionButton";
import AnalyticsTracker from "components/AnalyticsTracker";
import NotFound from "pages/NotFound";
import ProtectedRoute from "components/ProtectedRoute";
import BusinessProfilePage from './pages/business-profile-page';
import PostClassifiedAd from './pages/post-classified-ad';
import UserAccountDashboard from './pages/user-account-dashboard';
import ClassifiedAdsListing from './pages/classified-ads-listing';
import BusinessDirectoryListing from './pages/business-directory-listing';
import Homepage from './pages/homepage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import AdminDashboard from './pages/admin-dashboard';
import AdminQuickBusinessEntry from './pages/admin-dashboard/AdminQuickBusinessEntry';
import EventsListing from './pages/events-listing';
import EventDetailPage from './pages/event-detail-page';
import PostEventForm from './pages/post-event-form';
import InteractiveMapPage from './pages/interactive-map-page';
import CommunityQAListing from './pages/community-q-a-listing';
import PostCommunityQuestionForm from './pages/post-community-question-form';
import CommunityQuestionDetailPage from './pages/community-question-detail-page';
import PublishBusinessForm from './pages/publish-business-form';
import UserBusinessDashboard from './pages/user-business-dashboard';
import ClassifiedAdDetail from './pages/classified-ad-detail';
import BusinessOwnerDashboard from './pages/business-owner-dashboard';
import BusinessSearchMapPage from './pages/business-search-map-page';
import JobsListing from './pages/jobs-listing';
import JobDetailPage from './pages/job-detail-page';
import PublishJobForm from './pages/publish-job-form';
import JobApplicationForm from './pages/job-application-form';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AnalyticsTracker />
        <ScrollToTop />
        <FloatingActionButton />
        <RouterRoutes>
          <Route path="/" element={<BusinessDirectoryListing />} />
          <Route path="/homepage" element={<Homepage />} />
          <Route path="/business-directory-listing" element={<BusinessDirectoryListing />} />
          <Route path="/directorio-negocios" element={<BusinessDirectoryListing />} />
          <Route path="/business-profile-page" element={<BusinessProfilePage />} />
          <Route path="/classified-ads-listing" element={<ClassifiedAdsListing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/post-classified-ad" element={<PostClassifiedAd />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><UserAccountDashboard /></ProtectedRoute>
          } />
          <Route path="/user-account-dashboard" element={
            <ProtectedRoute><UserAccountDashboard /></ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/ingreso-rapido" element={
            <ProtectedRoute><AdminQuickBusinessEntry /></ProtectedRoute>
          } />
          <Route path="/eventos" element={<EventsListing />} />
          <Route path="/post-event-form" element={
            <ProtectedRoute><PostEventForm /></ProtectedRoute>
          } />
          <Route path="/eventos/nuevo" element={
            <ProtectedRoute><PostEventForm /></ProtectedRoute>
          } />
          <Route path="/eventos/:id" element={<EventDetailPage />} />
          <Route path="/mapa" element={<InteractiveMapPage />} />
          <Route path="/interactive-map-page" element={<InteractiveMapPage />} />
          <Route path="/buscar" element={<BusinessSearchMapPage />} />
          <Route path="/empleos" element={<JobsListing />} />
          <Route path="/empleo/:slug" element={<JobDetailPage />} />
          <Route path="/publicar-empleo" element={
            <ProtectedRoute><PublishJobForm /></ProtectedRoute>
          } />
          <Route path="/postular" element={<JobApplicationForm />} />
          <Route path="/comunidad" element={<CommunityQAListing />} />
          <Route path="/community-q-a-listing" element={<CommunityQAListing />} />
          <Route path="/comunidad/nueva" element={
            <ProtectedRoute><PostCommunityQuestionForm /></ProtectedRoute>
          } />
          <Route path="/post-community-question-form" element={
            <ProtectedRoute><PostCommunityQuestionForm /></ProtectedRoute>
          } />
          <Route path="/comunidad/:id" element={<CommunityQuestionDetailPage />} />
          <Route path="/community-question-detail-page" element={<CommunityQuestionDetailPage />} />
          <Route path="/publicar-negocio" element={
            <ProtectedRoute><PublishBusinessForm /></ProtectedRoute>
          } />
          <Route path="/mis-negocios" element={
            <ProtectedRoute><UserBusinessDashboard /></ProtectedRoute>
          } />
          <Route path="/dashboard-negocio" element={
            <ProtectedRoute><BusinessOwnerDashboard /></ProtectedRoute>
          } />
          <Route path="/clasificados/:id" element={<ClassifiedAdDetail />} />
          <Route path="/publish-business-form" element={
            <ProtectedRoute><PublishBusinessForm /></ProtectedRoute>
          } />
          <Route path="/user-business-dashboard" element={
            <ProtectedRoute><UserBusinessDashboard /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
