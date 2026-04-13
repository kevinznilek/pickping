import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';
import { formatTime } from '@/lib/utils';

async function getGames(organizerId: string) {
  return db.game.findMany({
    where: { organizer_id: organizerId },
    include: {
      game_rosters: {
        include: { player: true },
      },
      game_instances: {
        where: { date: { gte: new Date() } },
        take: 1,
        orderBy: { date: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export default async function GamesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Not authenticated</div>;
  }

  const games = await getGames(session.user.id);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Games</h1>
          <p className="text-gray-600">Manage your recurring pickup games</p>
        </div>
        <Link
          href="/dashboard/games/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Create New Game
        </Link>
      </div>

      {/* Games List */}
      {games.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-12">
          <div className="text-6xl mb-4 font-bold text-gray-400">P</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No games yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create your first pickup game to start managing players and automating confirmations.
          </p>
          <Link
            href="/dashboard/games/new"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Your First Game
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const regulars = game.game_rosters.filter(r => r.role === 'REGULAR');
            const subs = game.game_rosters.filter(r => r.role === 'SUB');
            const nextInstance = game.game_instances[0];

            return (
              <div key={game.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{game.name}</h3>
                      <p className="text-sm text-gray-600">{game.location}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      ${game.cost_per_player}/player
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-600 mb-2">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][game.day_of_week]}s at {formatTime(game.time)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {game.total_spots} spots total
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-4 text-sm">
                    <div className="flex space-x-4">
                      <span className="text-green-600">{regulars.length} regulars</span>
                      <span className="text-blue-600">{subs.length} subs</span>
                    </div>
                  </div>

                  {nextInstance && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Next game:</div>
                      <div className="text-sm font-medium">
                        {format(nextInstance.date, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/games/${game.id}`}
                      className="flex-1 bg-green-600 text-white text-center py-2 px-3 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/dashboard/games/${game.id}/roster`}
                      className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-3 rounded text-sm hover:bg-gray-200 transition-colors"
                    >
                      Roster
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}