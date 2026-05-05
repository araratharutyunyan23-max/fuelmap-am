import { AdminShell } from '@/components/admin/admin-shell';

export const metadata = {
  title: 'FuelMap Admin',
  robots: 'noindex, nofollow',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
