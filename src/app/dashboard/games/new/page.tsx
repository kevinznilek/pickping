'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewGamePage() {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    day_of_week: '0', // Sunday
    time: '',
    total_spots: '8',
    cost_per_player: '0',
    confirm_deadline_hours: '48',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          day_of_week: parseInt(formData.day_of_week),
          total_spots: parseInt(formData.total_spots),
          cost_per_player: parseFloat(formData.cost_per_player),
          confirm_deadline_hours: parseInt(formData.confirm_deadline_hours),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create game');
      }

      const data = await response.json();
      router.push(`/dashboard/games/${data.game.id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/games" className="text-green-600 hover:text-green-700 text-sm">
          ← Back to Games
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Game</h1>
        <p className="text-gray-600">Set up a recurring pickup game with auto-confirmations</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Game Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Thursday Night Doubles"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Bobby Riggs Tennis Center"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700 mb-2">
                Day of Week *
              </label>
              <select
                id="day_of_week"
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {dayOptions.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="total_spots" className="block text-sm font-medium text-gray-700 mb-2">
                Total Spots *
              </label>
              <input
                type="number"
                id="total_spots"
                name="total_spots"
                value={formData.total_spots}
                onChange={handleChange}
                required
                min="2"
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div>
              <label htmlFor="cost_per_player" className="block text-sm font-medium text-gray-700 mb-2">
                Cost per Player ($)
              </label>
              <input
                type="number"
                id="cost_per_player"
                name="cost_per_player"
                value={formData.cost_per_player}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm_deadline_hours" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmation Deadline (hours before game)
            </label>
            <select
              id="confirm_deadline_hours"
              name="confirm_deadline_hours"
              value={formData.confirm_deadline_hours}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="12">12 hours before</option>
              <option value="24">24 hours before</option>
              <option value="48">48 hours before (recommended)</option>
              <option value="72">72 hours before</option>
            </select>
            <p className="text-sm text-gray-600 mt-1">
              How far in advance to send confirmation texts to regulars
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• You'll add regular players who are in by default each week</li>
              <li>• You'll add substitute players in priority order</li>
              <li>• {formData.confirm_deadline_hours} hours before each game, regulars get "you in?" texts</li>
              <li>• If regulars drop out, subs get notified automatically</li>
            </ul>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <Link
              href="/dashboard/games"
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-semibold text-center hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}