import { getExpenses, getJobs, getEmployees, getCustomers, getExpenseCategories } from '@/lib/airtable';
import ReportsClient from './ReportsClient';

export default async function AdminReportsPage() {
  const [expenses, jobs, employees, categories, customers] = await Promise.all([
    getExpenses(),
    getJobs(),
    getEmployees(),
    getExpenseCategories(),
    getCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
      <ReportsClient 
        expenses={expenses} 
        jobs={jobs} 
        employees={employees} 
        categories={categories} 
        customers={customers} 
      />
    </div>
  );
}
