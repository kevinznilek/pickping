'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              An unexpected error occurred.
            </p>
            <div className="mt-8 text-center">
              <button
                onClick={reset}
                className="font-medium text-green-600 hover:text-green-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}