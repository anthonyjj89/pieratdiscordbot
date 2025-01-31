import { getProviders } from 'next-auth/react';
import SignInForm from '@/components/auth/SignInForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - PieRat',
  description: 'Sign in to your PieRat account using Discord',
};

export default async function SignIn() {
  const providers = await getProviders();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome to PieRat</h1>
          <p className="mt-2 text-gray-400">
            Sign in with Discord to access your organization&apos;s dashboard
          </p>
        </div>
        <SignInForm providers={providers} />
      </div>
    </div>
  );
}
