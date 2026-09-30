import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, Receipt, PieChart, Zap } from 'lucide-react';
import AdminLogoutButton from './AdminLogoutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  if (cookieStore.get('employeeId')?.value) {
    redirect('/employee');
  }

  if (cookieStore.get('adminSession')?.value !== 'true') {
    redirect('/admin-login');
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-slate-900 tracking-tight">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            PriorityPower
          </div>
          <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/admin/customers" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Customers</span>
            </Link>
            <Link href="/admin/jobs" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Briefcase className="w-4 h-4" /> <span className="hidden sm:inline">Jobs</span>
            </Link>
            <Link href="/admin/expenses" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Receipt className="w-4 h-4" /> <span className="hidden sm:inline">Expenses</span>
            </Link>
            <Link href="/admin/reports" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <PieChart className="w-4 h-4" /> <span className="hidden sm:inline">Reports</span>
            </Link>
            <div className="pl-2 ml-2 border-l border-slate-200 flex items-center">
              <AdminLogoutButton />
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
