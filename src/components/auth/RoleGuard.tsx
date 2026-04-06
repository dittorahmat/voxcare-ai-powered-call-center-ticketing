import React from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  agent: 1,
  supervisor: 2,
  admin: 3,
};

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback ?? null}</>;
  }

  if (ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[requiredRole]) {
    return <>{children}</>;
  }

  return <>{fallback ?? <AccessDenied />}</>;
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
          <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
        <a href="/" className="text-indigo-600 hover:underline text-sm">Return to Dashboard</a>
      </div>
    </div>
  );
}
