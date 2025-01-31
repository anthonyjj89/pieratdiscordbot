import { signIn } from 'next-auth/react';
import Image from 'next/image';

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
}

interface SignInFormProps {
  providers: Record<string, Provider> | null;
}

export default function SignInForm({ providers }: SignInFormProps) {
  if (!providers) return null;

  return (
    <div className="mt-8 space-y-4">
      {Object.values(providers).map((provider) => (
        <div key={provider.id}>
          <button
            onClick={() => signIn(provider.id, { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 space-x-2"
          >
            <Image
              src="/discord-mark-white.svg"
              alt="Discord logo"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span>Sign in with {provider.name}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
