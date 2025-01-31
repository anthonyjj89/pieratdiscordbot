import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication Error - PieRat',
  description: 'An error occurred during authentication',
};

export default function AuthError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The sign in link is no longer valid.',
    Default: 'An error occurred during authentication.',
  };

  const error = searchParams.error || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg text-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Authentication Error</h1>
          <div className="mt-4">
            <p className="text-red-400">{errorMessage}</p>
          </div>
        </div>
        <div className="mt-8">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </Link>
        </div>
      </div>
    </div>
  );
}
