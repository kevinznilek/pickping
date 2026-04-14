export default function HomePage() {
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
              Pickup pickleball made simple
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              A super simple way to manage your pickleball games. Automatically fill spots when regulars can&apos;t make it, send easy Venmo payment links and stop stressing about who is going to play.
            </p>
            <div className="space-x-4">
              <button
                disabled
                className="bg-gray-400 text-white px-8 py-3 rounded-lg text-lg cursor-not-allowed inline-block"
              >
                Coming Soon
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Set Your Roster</h3>
              <p className="text-gray-600">Add regulars and subs in priority order. Set when confirmations go out.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold mb-2">Auto-Text Players</h3>
              <p className="text-gray-600">Players confirm via simple YES/NO texts. Subs fill open spots automatically.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Collect Payment</h3>
              <p className="text-gray-600">Send Venmo links automatically. No more chasing people for court fees.</p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-3xl font-bold mb-4">Coming Soon!</h2>
            <p className="text-gray-600 mb-6">
              PickPing is being fine-tuned for the perfect pickup game experience.
            </p>
            <p className="text-sm text-gray-500">
              Contact: <a href="mailto:hello@pickping.com" className="text-green-600">hello@pickping.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}