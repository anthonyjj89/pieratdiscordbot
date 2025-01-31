'use client';

import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  FolderIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: FolderIcon },
  { name: 'Crew', href: '/dashboard/crew', icon: UsersIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-800 px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center">
          <h1 className="text-2xl font-bold text-white">PieRat</h1>
        </div>
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                          ${isActive 
                            ? 'bg-gray-700 text-white' 
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }
                        `}
                      >
                        <item.icon
                          className="h-6 w-6 shrink-0"
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="mt-auto">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-300">
                {session?.user?.image && (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={40}
                    height={40}
                    className="h-8 w-8 rounded-full bg-gray-700"
                  />
                )}
                <span className="sr-only">Your profile</span>
                <span aria-hidden="true">{session?.user?.name}</span>
                <button
                  onClick={() => signOut()}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  Sign out
                </button>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
