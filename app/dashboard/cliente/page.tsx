import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ClienteDashboard from './cliente-dashboard';

export default async function ClienteDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }

  return <ClienteDashboard />;
}
