import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import TatuadorDashboard from './tatuador-dashboard';

export default async function TatuadorDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }

  return <TatuadorDashboard />;
}
