import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { formatTime } from '@/lib/utils';
import { GmailConnect } from '@/components/gmail-connect';

async function getDashboardData(organizerId: string) {
  const [games, upcomingInstances, totalPlayers, organizer] = await Promise.all([
    // Get all games for this organizer
    db.game.findMany({
      where: { organizer_id: organizerId },
      include: {
        game_rosters: {
          include: { player: true },
        },
      },
      orderBy: { created_at: 'desc' },
    }),

    // Get upcoming game instances for this week
    db.gameInstance.findMany({
      where: {
        game: { organizer_id: organizerId },
        date: {
          gte: startOfWeek(new Date()),
          lte: endOfWeek(addDays(new Date(), 7)), // Next 2 weeks
        },
      },
      include: {
        game: true,
        game_confirmations: {
          include: { player: true },
        },
      },
      orderBy: { date: 'asc' },
    }),

    // Get total unique players across all games
    db.player.count({
      where: {
        game_rosters: {
          some: {
            game: { organizer_id: organizerId },
          },
        },
      },
    }),

    // Get organizer with Gmail connection status
    db.organizer.findUnique({
      where: { id: organizerId },
      select: {
        gmail_connected_at: true,
        gmail_access_token: true,
      },
    }),
  ]);

  return { games, upcomingInstances, totalPlayers, organizer };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return <div>Not authenticated</div>;
  }

  const { games, upcomingInstances, totalPlayers, organizer } = await getDashboardData(session.user.id);

  const totalGames = games.length;
  const totalRegulars = games.reduce((acc, game) =>
    acc + game.game_rosters.filter(r => r.role === 'REGULAR').length, 0
  );
  const totalSubs = games.reduce((acc, game) =>
    acc + game.game_rosters.filter(r => r.role === 'SUB').length, 0
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {session.user.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{totalGames}</div>
          <div className="text-sm text-gray-600">Active Games</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{totalPlayers}</div>
          <div className="text-sm text-gray-600">Total Players</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{totalRegulars}</div>
          <div className="text-sm text-gray-600">Regulars</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{totalSubs}</div>
          <div className="text-sm text-gray-600">Subs</div>
        </div>
      </div>

      {/* Gmail Integration */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Email Integration</h2>
        </div>
        <div className="p-6">
          <GmailConnect
            isConnected={!!organizer?.gmail_access_token}
            connectedAt={organizer?.gmail_connected_at?.toISOString()}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Games */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Upcoming Games</h2>
          </div>
          <div className="p-6">
            {upcomingInstances.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No upcoming games scheduled
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingInstances.map((instance) => {
                  const confirmedCount = instance.game_confirmations.filter(
                    c => c.status === 'CONFIRMED'
                  ).length;

                  return (
                    <div key={instance.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{instance.game.name}</h3>
                          <p className="text-sm text-gray-600">
                            {format(instance.date, 'EEEE, MMM d')} at {formatTime(instance.game.time)}
                          </p>
                          <p className="text-sm text-gray-600">{instance.game.location}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {confirmedCount}/{instance.game.total_spots} confirmed
                          </div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                            instance.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
                            instance.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {instance.status.toLowerCase()}
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

        {/* Your Games */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Your Games</h2>
            <Link
              href="/dashboard/games/new"
              className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition-colors"
            >
              New Game
            </Link>
          </div>
          <div className="p-6">
            {games.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No games created yet</p>
                <Link
                  href="/dashboard/games/new"
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Your First Game
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => {
                  const regularCount = game.game_rosters.filter(r => r.role === 'REGULAR').length;
                  const subCount = game.game_rosters.filter(r => r.role === 'SUB').length;

                  return (
                    <div key={game.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{game.name}</h3>
                          <p className="text-sm text-gray-600">{game.location}</p>
                          <p className="text-sm text-gray-600">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][game.day_of_week]}s at {formatTime(game.time)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div>{regularCount} regulars, {subCount} subs</div>
                          <div className="text-gray-600">{game.total_spots} total spots</div>
                          <Link
                            href={`/dashboard/games/${game.id}`}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Manage →
                          </Link>
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
  );
}