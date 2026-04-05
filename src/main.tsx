import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
import { MainLayout } from '@/components/layout/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Tickets } from '@/pages/Tickets'
import { LiveCall } from '@/pages/LiveCall'
import { TicketDetails } from '@/pages/TicketDetails'
import { useTicketStore } from '@/store/ticketStore';
const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "tickets", element: <Tickets /> },
      { path: "tickets/:id", element: <TicketDetails /> },
      { path: "live-call", element: <LiveCall /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  }
]);
function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useTicketStore(s => s.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
  return <>{children}</>;
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AppInitializer>
          <RouterProvider router={router} />
        </AppInitializer>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
)