import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-16">
            <h1 className="text-5xl font-bold mb-6">
              <span className="text-black">Pick</span><span className="text-green-600">Ping</span>
            </h1>
            <h2 className="text-2xl text-gray-700 mb-8">
              Dead-simple pickup pickleball game roster manager
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Auto-fill subs when regulars drop out. Send Venmo payment links.
              Stop herding cats every week to fill your court.
            </p>
            <div className="space-x-4">
              <Link
                href="/auth/signup"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/auth/signin"
                className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-semibold border-2 border-green-600 hover:bg-green-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold mb-3">Auto-Fill Subs</h3>
              <p className="text-gray-600">
                When regulars drop out, subs get notified automatically in priority order via SMS.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-3">Venmo Links</h3>
              <p className="text-gray-600">
                Players get pre-filled Venmo payment links for court fees. No manual collection needed.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-3">SMS-Only Players</h3>
              <p className="text-gray-600">
                Players don't need accounts. They confirm via simple YES/NO text messages.
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-16">
            <h3 className="text-2xl font-semibold mb-8">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-green-600 font-bold mb-4">1</div>
                <h4 className="font-semibold mb-2">Set Up Your Game</h4>
                <p className="text-gray-600 text-sm">Create a recurring game with regulars and ranked subs.</p>
              </div>
              <div>
                <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-green-600 font-bold mb-4">2</div>
                <h4 className="font-semibold mb-2">Auto Confirmations</h4>
                <p className="text-gray-600 text-sm">2 days before, regulars get "you in?" texts. Subs fill open spots.</p>
              </div>
              <div>
                <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center text-green-600 font-bold mb-4">3</div>
                <h4 className="font-semibold mb-2">Payment & Play</h4>
                <p className="text-gray-600 text-sm">Confirmed players get Venmo links. Show up and play!</p>
              </div>
            </div>
          </div>

          {/* Target User */}
          <div className="bg-blue-50 rounded-lg p-8">
            <h3 className="text-2xl font-semibold mb-4">Perfect for Game Organizers</h3>
            <p className="text-gray-700 max-w-2xl mx-auto">
              You're the person who organizes the weekly pickup game at your local court.
              You know how much work goes into filling spots every week.
              PickPing automates the tedious parts so you can focus on playing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}