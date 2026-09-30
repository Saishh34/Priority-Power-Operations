import { getExpenses, getJobs, getEmployees, getCustomers, getExpenseCategories } from '@/lib/airtable';
import ExpensesClient from './ExpensesClient';

export default async function AdminExpensesPage() {
  const [expenses, jobs, employees, categories, customers] = await Promise.all([
    getExpenses(),
    getJobs(),
    getEmployees(),
    getExpenseCategories(),
    getCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Expense Approvals</h1>
      <ExpensesClient 
        initialExpenses={expenses} 
        jobs={jobs} 
        employees={employees} 
        categories={categories} 
        customers={customers} 
      />
    </div>
  );
}
