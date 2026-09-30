import Link from 'next/link';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg text-green-600">Employee Area</div>
          <nav className="flex space-x-4 text-sm font-medium">
            <Link href="/employee" className="text-gray-600 hover:text-black">Home</Link>
            <Link href="/employee/expenses" className="text-gray-600 hover:text-black">My Expenses</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-3xl mx-auto md:p-4">
        {children}
      </main>
    </div>
  );
}
