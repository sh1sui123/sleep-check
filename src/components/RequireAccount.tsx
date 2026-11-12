import { Navigate, Outlet } from 'react-router-dom';
import { useAccounts, useSession } from '@/hooks/useSession';

export default function RequireAccount() {
  const session = useSession();
  const accounts = useAccounts();
  const valid = Boolean(session) && accounts.some((account) => account.id === session);
  if (!valid) return <Navigate to="/auth" replace />;
  return <Outlet />;
}
