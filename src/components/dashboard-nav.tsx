'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export function DashboardNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navigation = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Games', href: '/dashboard/games' },
    { name: 'Players', href: '/dashboard/players' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and main nav */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold">
              <span className="text-black">Pick</span><span className="text-green-600">Ping</span>
            </Link>

            <div className="hidden md:flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="md:hidden border-t border-gray-200 pt-4 pb-4">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}