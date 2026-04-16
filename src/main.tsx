import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import '@/index.css'
import '@/index.print.css'
import { MainLayout } from '@/components/layout/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Tickets } from '@/pages/Tickets'
import { LiveCall } from '@/pages/LiveCall'
import { TicketDetails } from '@/pages/TicketDetails'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { Customers } from '@/pages/Customers'
import { CustomerDetails } from '@/pages/CustomerDetails'
import { Calls } from '@/pages/Calls'
import { AuditLog } from '@/pages/AuditLog'
import { NotFound } from '@/pages/NotFound'
import { PublicTicketView } from '@/pages/PublicTicketView'
import { Wallboard } from '@/pages/Wallboard'
import { UserManagement } from '@/pages/Admin/UserManagement'
import { AgentQueue } from '@/pages/Admin/AgentQueue'
import { ShiftSchedulePage } from '@/pages/Admin/ShiftSchedule'
import { SettingsLayout } from '@/pages/Settings/SettingsLayout'
import { ProfileSettings } from '@/pages/Settings/ProfileSettings'
import { SystemSettings } from '@/pages/Settings/SystemSettings'
import { SLASettings } from '@/pages/Settings/SLASettings'
import { AISettings } from '@/pages/Settings/AISettings'
import { CannedResponsesSettings } from '@/pages/Settings/CannedResponsesSettings'
import { AutoCloseRulesSettings } from '@/pages/Settings/AutoCloseRulesSettings'
import { EmailTemplateSettings } from '@/pages/Settings/EmailTemplateSettings'
import { ScheduledReportsSettings } from '@/pages/Settings/ScheduledReportsSettings'
import { NotificationSettings } from '@/pages/Settings/NotificationSettings'
import { KnowledgeBaseSettings } from '@/pages/Settings/KnowledgeBaseSettings'
import { WhatsAppSettings } from '@/pages/Settings/WhatsAppSettings'
import { QualityDashboard } from '@/pages/QualityDashboard'
import { AnalyticsDashboard } from '@/pages/AnalyticsDashboard'
import { useTicketStore } from '@/store/ticketStore';
import { CustomerAuthProvider } from '@/context/CustomerAuthContext';
import { CustomerLoginPage } from '@/pages/CustomerLoginPage';
import { CustomerRegisterPage } from '@/pages/CustomerRegisterPage';
import { CustomerForgotPasswordPage, CustomerResetPasswordPage, CustomerVerifyPage } from '@/pages/CustomerAuthPages';
import { CustomerDashboardPage } from '@/pages/CustomerDashboardPage';
import { CustomerTicketsPage, CustomerNewTicketPage, CustomerTicketDetailPage } from '@/pages/CustomerTicketPages';
import { CustomerProfilePage } from '@/pages/CustomerProfilePage';
import { CustomerChatPage } from '@/pages/CustomerChatPage';
import { KnowledgeBasePage, KnowledgeBaseArticlePage } from '@/pages/KnowledgeBasePage';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  // Public routes
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/public/ticket/:token", element: <PublicTicketView /> },
  { path: "/kb", element: <KnowledgeBasePage /> },
  { path: "/kb/:id", element: <KnowledgeBaseArticlePage /> },
  // Customer portal routes
  {
    path: "/customer",
    element: <CustomerAuthProvider><Outlet /></CustomerAuthProvider>,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/customer/dashboard" replace /> },
      { path: "login", element: <CustomerLoginPage /> },
      { path: "register", element: <CustomerRegisterPage /> },
      { path: "verify/:token", element: <CustomerVerifyPage /> },
      { path: "forgot-password", element: <CustomerForgotPasswordPage /> },
      { path: "reset-password/:token", element: <CustomerResetPasswordPage /> },
      { path: "dashboard", element: <CustomerDashboardPage /> },
      { path: "tickets", element: <CustomerTicketsPage /> },
      { path: "tickets/new", element: <CustomerNewTicketPage /> },
      { path: "tickets/:id", element: <CustomerTicketDetailPage /> },
      { path: "profile", element: <CustomerProfilePage /> },
      { path: "chat", element: <CustomerChatPage /> },
    ],
  },
  // Protected routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tickets", element: <Tickets /> },
      { path: "tickets/:id", element: <TicketDetails /> },
      { path: "live-call", element: <LiveCall /> },
      { path: "customers", element: <Customers /> },
      { path: "customers/:id", element: <CustomerDetails /> },
      { path: "calls", element: <Calls /> },
      { path: "admin/users", element: <RoleGuard requiredRole="admin"><UserManagement /></RoleGuard> },
      { path: "admin/queue", element: <RoleGuard requiredRole="supervisor"><AgentQueue /></RoleGuard> },
      { path: "admin/shifts", element: <RoleGuard requiredRole="supervisor"><ShiftSchedulePage /></RoleGuard> },
      { path: "audit", element: <RoleGuard requiredRole="supervisor"><AuditLog /></RoleGuard> },
      { path: "analytics", element: <RoleGuard requiredRole="supervisor"><AnalyticsDashboard /></RoleGuard> },
      { path: "quality", element: <QualityDashboard /> },
      { path: "wallboard", element: <Wallboard /> },
      {
        path: "settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <ProfileSettings /> },
          { path: "profile", element: <ProfileSettings /> },
          { path: "system", element: <RoleGuard requiredRole="admin"><SystemSettings /></RoleGuard> },
          { path: "sla", element: <RoleGuard requiredRole="admin"><SLASettings /></RoleGuard> },
          { path: "autoclose", element: <RoleGuard requiredRole="admin"><AutoCloseRulesSettings /></RoleGuard> },
          { path: "canned", element: <RoleGuard requiredRole="admin"><CannedResponsesSettings /></RoleGuard> },
          { path: "ai", element: <RoleGuard requiredRole="admin"><AISettings /></RoleGuard> },
          { path: "notifications", element: <NotificationSettings /> },
          { path: "email-templates", element: <RoleGuard requiredRole="admin"><EmailTemplateSettings /></RoleGuard> },
          { path: "scheduled-reports", element: <RoleGuard requiredRole="admin"><ScheduledReportsSettings /></RoleGuard> },
          { path: "knowledge-base", element: <RoleGuard requiredRole="admin"><KnowledgeBaseSettings /></RoleGuard> },
          { path: "whatsapp", element: <RoleGuard requiredRole="admin"><WhatsAppSettings /></RoleGuard> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>,
);

useTicketStore.getState().initialize().catch(console.error);
