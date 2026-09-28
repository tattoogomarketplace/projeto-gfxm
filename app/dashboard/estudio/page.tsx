import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import EstudioDashboard from './estudio-dashboard';

export default async function EstudioDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }

  return <EstudioDashboard />;
}
