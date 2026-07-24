'use client';

import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Phone, 
  Shield, 
  Clock, 
  List,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '../lib/auth-context';
import { cn } from '../lib/utils';

const navigation: Array<{ name: string; href: string; icon: any }> = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Phone },
  { name: 'Lead Lists', href: '/lead-lists', icon: FileSpreadsheet },
  { name: 'Leads', href: '/leads', icon: Users },
  { name: 'CSV Import', href: '/import', icon: List },
  { name: 'DNC', href: '/dnc', icon: XCircle },
  { name: 'Consent', href: '/consent', icon: CheckCircle },
  { name: 'Callbacks', href: '/callbacks', icon: Clock },
  { name: 'Dispositions', href: '/dispositions', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">RDCS Dialer</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href as any}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600">
            <span className="text-sm font-medium">
              {user?.firstName?.[0] || user?.email?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
