import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PhoneCall, Home, Search } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <PhoneCall className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-6xl font-bold text-slate-900">404</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mt-2">Page Not Found</h2>
          <p className="text-muted-foreground mt-2">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link to="/"><Home className="size-4 mr-2" /> Return to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tickets"><Search className="size-4 mr-2" /> Browse Tickets</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
