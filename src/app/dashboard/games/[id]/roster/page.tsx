'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Player {
  id: string;
  name: string;
  phone: string;
}

interface RosterEntry {
  id: string;
  player: Player;
  role: 'REGULAR' | 'SUB';
  priority?: number;
}

interface Game {
  id: string;
  name: string;
  location: string;
  total_spots: number;
  game_rosters: RosterEntry[];
}

export default function RosterManagePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerForm, setNewPlayerForm] = useState({
    name: '',
    phone: '',
    role: 'REGULAR' as 'REGULAR' | 'SUB',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const fetchGame = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) throw new Error('Failed to fetch game');
      const data = await response.json();
      setGame(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/games/${gameId}/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlayerForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add player');
      }

      // Reset form and refresh
      setNewPlayerForm({ name: '', phone: '', role: 'REGULAR' });
      setShowAddPlayer(false);
      await fetchGame();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePlayer = async (rosterId: string) => {
    if (!confirm('Remove this player from the roster?')) return;

    try {
      const response = await fetch(`/api/games/${gameId}/roster/${rosterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove player');
      }

      await fetchGame();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleMoveSubPriority = async (rosterId: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/games/${gameId}/roster/${rosterId}/priority`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update priority');
      }

      await fetchGame();
    } catch (error: any) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600">Game not found</div>
      </div>
    );
  }

  const regulars = game.game_rosters.filter((r: any) => r.role === 'REGULAR');
  const subs = game.game_rosters.filter((r: any) => r.role === 'SUB').sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href={`/dashboard/games/${gameId}`} className="text-green-600 hover:text-green-700 text-sm">
          ← Back to {game.name}
        </Link>
        <div className="flex justify-between items-start mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Roster</h1>
            <p className="text-gray-600">{game.name} at {game.location}</p>
          </div>
          <button
            onClick={() => setShowAddPlayer(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Add Player
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Regulars */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-green-600">
              Regulars ({regulars.length})
            </h2>
            <p className="text-sm text-gray-600">
              Players who are in by default each week
            </p>
          </div>
          <div className="p-6">
            {regulars.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No regulars added yet. Add players who play every week.
              </p>
            ) : (
              <div className="space-y-3">
                {regulars.map((roster: any) => (
                  <div key={roster.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{roster.player.name}</div>
                      <div className="text-sm text-gray-600">{roster.player.phone}</div>
                    </div>
                    <button
                      onClick={() => handleRemovePlayer(roster.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-blue-600">
              Subs ({subs.length})
            </h2>
            <p className="text-sm text-gray-600">
              Backup players in priority order (drag to reorder)
            </p>
          </div>
          <div className="p-6">
            {subs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No subs added yet. Add backup players for when regulars can&apos;t make it.
              </p>
            ) : (
              <div className="space-y-3">
                {subs.map((roster: any, index: number) => (
                  <div key={roster.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{roster.player.name}</div>
                        <div className="text-sm text-gray-600">{roster.player.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => handleMoveSubPriority(roster.id, 'up')}
                          disabled={index === 0}
                          className="text-xs text-gray-600 hover:text-gray-800 disabled:text-gray-300"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveSubPriority(roster.id, 'down')}
                          disabled={index === subs.length - 1}
                          className="text-xs text-gray-600 hover:text-gray-800 disabled:text-gray-300"
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemovePlayer(roster.id)}
                        className="text-red-600 hover:text-red-700 text-sm ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <form onSubmit={handleAddPlayer} className="p-6">
              <h3 className="text-lg font-semibold mb-4">Add New Player</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newPlayerForm.name}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={newPlayerForm.phone}
                    onChange={(e) => setNewPlayerForm({...newPlayerForm, phone: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="REGULAR"
                        checked={newPlayerForm.role === 'REGULAR'}
                        onChange={(e) => setNewPlayerForm({...newPlayerForm, role: e.target.value as 'REGULAR' | 'SUB'})}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium text-green-600">Regular</div>
                        <div className="text-xs text-gray-600">In every week</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="SUB"
                        checked={newPlayerForm.role === 'SUB'}
                        onChange={(e) => setNewPlayerForm({...newPlayerForm, role: e.target.value as 'REGULAR' | 'SUB'})}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium text-blue-600">Sub</div>
                        <div className="text-xs text-gray-600">Backup player</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Player'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}