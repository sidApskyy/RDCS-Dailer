'use client';

import { Bell, Settings } from 'lucide-react';

import { useAuth } from '../lib/auth-context';

import { Button } from './ui/button';

export function TopNav() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
            <span className="text-sm font-medium">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
