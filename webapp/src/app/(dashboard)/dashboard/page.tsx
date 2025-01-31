import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - PieRat',
  description: 'Overview of your piracy operations',
};

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/signin');
  }

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
            Welcome back, {session.user?.name}
          </h2>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity Card */}
        <div className="bg-gray-800 shadow-sm ring-1 ring-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white">Recent Activity</h3>
          <p className="mt-2 text-sm text-gray-400">
            No recent activity to display.
          </p>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-gray-800 shadow-sm ring-1 ring-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white">Quick Stats</h3>
          <dl className="mt-2 grid grid-cols-1 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-400">Total Hits</dt>
              <dd className="mt-1 text-3xl font-semibold text-white">0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-400">Total Value</dt>
              <dd className="mt-1 text-3xl font-semibold text-white">0 aUEC</dd>
            </div>
          </dl>
        </div>

        {/* Organization Card */}
        <div className="bg-gray-800 shadow-sm ring-1 ring-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white">Organization</h3>
          <p className="mt-2 text-sm text-gray-400">
            No organization selected. Please join or create an organization.
          </p>
        </div>
      </div>
    </div>
  );
}
