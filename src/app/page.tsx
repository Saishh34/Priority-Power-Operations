import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ExpTracker</h1>
          <p className="text-gray-500 mt-2">Manage jobs and expenses easily.</p>
        </div>
        
        <div className="space-y-4 pt-4">
          <Link href="/employee" className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors">
            Enter as Employee
          </Link>
          <Link href="/admin" className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Enter as Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
