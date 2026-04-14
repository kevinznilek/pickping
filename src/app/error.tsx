'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Something went wrong
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          An error occurred while loading this page.
        </p>
        <div className="mt-8 text-center space-x-4">
          <button
            onClick={reset}
            className="font-medium text-green-600 hover:text-green-500"
          >
            Try again
          </button>
          <a
            href="/"
            className="font-medium text-gray-600 hover:text-gray-500"
          >
            ← Go home
          </a>
        </div>
      </div>
    </div>
  );
}