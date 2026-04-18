'use client';

import { format } from 'date-fns';

interface GmailConnectProps {
  isConnected: boolean;
  connectedAt?: string | null;
}

export function GmailConnect({ isConnected, connectedAt }: GmailConnectProps) {
  if (isConnected) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <p className="font-medium text-green-700">Gmail Connected</p>
            <p className="text-sm text-gray-600">
              Connected {connectedAt
                ? format(new Date(connectedAt), 'MMM d, yyyy')
                : 'recently'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ✅ Automatic Venmo payment detection<br />
              ✅ YourCourts booking auto-import
            </p>
          </div>
        </div>
        <button
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => {
            alert('Disconnect functionality coming soon');
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">Connect Gmail Account</p>
        <p className="text-sm text-gray-600 mt-1">
          Connecting your Gmail enables powerful automation features:
        </p>
        <div className="text-sm text-gray-600 mt-2 space-y-1">
          <p>• <strong>Automatic Venmo payment tracking</strong> - Scan for payment notifications and update player status</p>
          <p>• <strong>YourCourts booking import</strong> - Import existing reservations and player lists</p>
          <p>• <strong>Payment reminders</strong> - Send automatic payment requests for upcoming games</p>
        </div>
        <div className="text-sm text-gray-500 mt-3">
          🔒 <strong>Privacy first:</strong> We only access emails from Venmo and YourCourts. Your other emails remain private.
        </div>
      </div>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        onClick={async () => {
          try {
            const response = await fetch('/api/auth/gmail/connect');
            const data = await response.json();
            if (data.authUrl) {
              window.location.href = data.authUrl;
            } else {
              alert('Failed to initiate Gmail connection');
            }
          } catch (error) {
            console.error('Gmail connect error:', error);
            alert('Failed to connect Gmail');
          }
        }}
      >
        <span>Connect Gmail</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </div>
  );
}
