import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';

async function getPlayers(organizerId: string) {
  // Get all players who are in games organized by this organizer
  return db.player.findMany({
    where: {
      game_rosters: {
        some: {
          game: {
            organizer_id: organizerId,
          },
        },
      },
    },
    include: {
      game_rosters: {
        where: {
          game: {
            organizer_id: organizerId,
          },
        },
        include: {
          game: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function PlayersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Not authenticated</div>;
  }

  const players = await getPlayers(session.user.id);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="text-gray-600">All players across your games</p>
        </div>
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12">
          <div className="text-6xl mb-4 font-bold text-gray-400">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No players yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Players will appear here when you add them to your game rosters.
          </p>
          <Link
            href="/dashboard/games"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Manage Games
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">All Players ({players.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {players.map((player) => {
              const games = player.game_rosters.map(roster => roster.game);
              const regularGames = player.game_rosters.filter(r => r.role === 'REGULAR');
              const subGames = player.game_rosters.filter(r => r.role === 'SUB');
              
              return (
                <div key={player.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{player.name}</h3>
                      <p className="text-sm text-gray-600">{player.phone}</p>
                      <div className="mt-2 flex items-center space-x-4 text-sm">
                        <span className="text-green-600">
                          {regularGames.length} regular{regularGames.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-blue-600">
                          {subGames.length} sub{subGames.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-500">
                          {games.length} total game{games.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Games:
                      </div>
                      <div className="mt-1 space-y-1">
                        {games.map((game) => {
                          const roster = player.game_rosters.find(r => r.game_id === game.id);
                          return (
                            <div key={game.id} className="text-sm">
                              <Link
                                href={`/dashboard/games/${game.id}`}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                {game.name}
                              </Link>
                              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                roster?.role === 'REGULAR' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {roster?.role?.toLowerCase()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}