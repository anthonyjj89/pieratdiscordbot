import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/signin');
  }

  // This won't be reached, but TypeScript needs a return
  return null;
}
