'use client';

import { useRouter } from 'next/navigation';
import { adminLogoutAction } from '@/actions/adminAuth';
import { LogOut } from 'lucide-react';

export default function AdminLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await adminLogoutAction();
    router.push('/admin-login');
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
    >
      <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
    </button>
  );
}
