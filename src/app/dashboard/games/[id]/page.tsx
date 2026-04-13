'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { formatTime } from '@/lib/utils';

export default function GameDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session, status } = useSession();
  const [game, setGame] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    fetchGame();
  }, [params.id, session, status]);

  async function fetchGame() {
    try {
      const response = await fetch(`/api/games/${params.id}`);
      if (!response.ok) {
        throw new Error('Game not found');
      }
      const gameData = await response.json();
      setGame(gameData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  if (!game) {
    return <div className="p-6">Game not found</div>;
  }

  const regulars = game.game_rosters.filter((r: any) => r.role === 'REGULAR');
  const subs = game.game_rosters.filter((r: any) => r.role === 'SUB');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/games" className="text-green-600 hover:text-green-700 text-sm">
          ← Back to Games
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
            <p className="text-gray-600">{game.location}</p>
            <p className="text-sm text-gray-500">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][game.day_of_week]}s at {formatTime(game.time)}
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/dashboard/games/${game.id}/edit`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Edit Game
            </Link>
            <Link
              href={`/dashboard/games/${game.id}/roster`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Manage Roster
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Details */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Game Details</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Spots:</span>
                <span className="font-medium">{game.total_spots}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cost per Player:</span>
                <span className="font-medium">${game.cost_per_player.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confirmation Deadline:</span>
                <span className="font-medium">{game.confirm_deadline_hours}h before</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Regulars:</span>
                <span className="font-medium text-green-600">{regulars.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subs:</span>
                <span className="font-medium text-blue-600">{subs.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Roster Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Roster Overview</h2>
              <Link
                href={`/dashboard/games/${game.id}/roster`}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Manage →
              </Link>
            </div>

            <div className="space-y-4">
              {/* Regulars */}
              <div>
                <h3 className="font-medium text-green-600 mb-2">Regulars ({regulars.length})</h3>
                {regulars.length === 0 ? (
                  <p className="text-sm text-gray-500">No regulars added yet</p>
                ) : (
                  <div className="space-y-1">
                    {regulars.slice(0, 5).map((roster: any) => (
                      <div key={roster.id} className="text-sm text-gray-700">
                        {roster.player.name}
                      </div>
                    ))}
                    {regulars.length > 5 && (
                      <div className="text-sm text-gray-500">
                        +{regulars.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subs */}
              <div>
                <h3 className="font-medium text-blue-600 mb-2">Subs ({subs.length})</h3>
                {subs.length === 0 ? (
                  <p className="text-sm text-gray-500">No subs added yet</p>
                ) : (
                  <div className="space-y-1">
                    {subs.slice(0, 5).map((roster: any, index: number) => (
                      <div key={roster.id} className="text-sm text-gray-700 flex justify-between">
                        <span>{roster.player.name}</span>
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>
                    ))}
                    {subs.length > 5 && (
                      <div className="text-sm text-gray-500">
                        +{subs.length - 5} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Games */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Upcoming Games</h2>
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/test-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameId: game.id }),
                      });
                      const result = await response.json();
                      if (response.ok) {
                        alert('Game scheduled and SMS sent!');
                        window.location.reload();
                      } else {
                        alert('Error: ' + result.error);
                      }
                    } catch (error) {
                      alert('Error: ' + error);
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Test SMS
                </button>
                <button
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg cursor-not-allowed transition-colors text-sm"
                  disabled
                  title="Auto-scheduling coming soon"
                >
                  Schedule Next
                </button>
              </div>
            </div>
            <div className="p-6">
              {game.game_instances.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📅</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming games scheduled</h3>
                  <p className="text-gray-600 mb-4">
                    Game instances will be automatically created based on your schedule
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {game.game_instances.map((instance: any) => {
                    const confirmedPlayers = instance.game_confirmations.filter((c: any) => c.status === 'CONFIRMED');
                    const pendingPlayers = instance.game_confirmations.filter((c: any) => c.status === 'PENDING');
                    const declinedPlayers = instance.game_confirmations.filter((c: any) => c.status === 'DECLINED');

                    return (
                      <div key={instance.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">
                              {format(instance.date, 'EEEE, MMMM d, yyyy')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatTime(game.time)} at {game.location}
                            </p>
                          </div>
                          <div className="text-right flex items-center space-x-2">
                            <button
                              onClick={async () => {
                                if (confirm('Delete this game instance? This will cancel all confirmations.')) {
                                  try {
                                    const response = await fetch(`/api/game-instances/${instance.id}`, {
                                      method: 'DELETE',
                                    });
                                    if (response.ok) {
                                      window.location.reload();
                                    } else {
                                      alert('Error deleting game instance');
                                    }
                                  } catch (error) {
                                    alert('Error: ' + error);
                                  }
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                              title="Delete game instance"
                            >
                              ✕
                            </button>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              instance.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
                              instance.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              instance.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {instance.status.toLowerCase()}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-green-600 mb-2">
                              Confirmed ({confirmedPlayers.length})
                            </h4>
                            {confirmedPlayers.length === 0 ? (
                              <p className="text-sm text-gray-500">None yet</p>
                            ) : (
                              <div className="space-y-1">
                                {confirmedPlayers.map((confirmation: any) => (
                                  <div key={confirmation.id} className="text-sm text-gray-700">
                                    {confirmation.player.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-yellow-600 mb-2">
                              Pending ({pendingPlayers.length})
                            </h4>
                            {pendingPlayers.length === 0 ? (
                              <p className="text-sm text-gray-500">None</p>
                            ) : (
                              <div className="space-y-1">
                                {pendingPlayers.map((confirmation: any) => (
                                  <div key={confirmation.id} className="text-sm text-gray-700">
                                    {confirmation.player.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-red-600 mb-2">
                              Declined ({declinedPlayers.length})
                            </h4>
                            {declinedPlayers.length === 0 ? (
                              <p className="text-sm text-gray-500">None</p>
                            ) : (
                              <div className="space-y-1">
                                {declinedPlayers.map((confirmation: any) => (
                                  <div key={confirmation.id} className="text-sm text-gray-700">
                                    {confirmation.player.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <span className="font-medium">
                                {confirmedPlayers.length}/{game.total_spots} spots filled
                              </span>
                              {game.total_spots - confirmedPlayers.length > 0 && (
                                <span className="text-gray-600 ml-2">
                                  ({game.total_spots - confirmedPlayers.length} open)
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                className="text-sm text-green-600 hover:text-green-700"
                                disabled
                              >
                                Send Reminder
                              </button>
                              <button
                                className="text-sm text-gray-600 hover:text-gray-700"
                                disabled
                              >
                                Manual Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}