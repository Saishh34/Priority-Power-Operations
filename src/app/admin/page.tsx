import { getCustomers, getEmployees, getExpenseCategories, getExpenses, getJobs } from "@/lib/airtable";
import DashboardClient from "./DashboardClient";

export default async function AdminDashboardPage() {
  const [jobs, expenses, customers, employees, categories] = await Promise.all([
    getJobs(),
    getExpenses(),
    getCustomers(),
    getEmployees(),
    getExpenseCategories(),
  ]);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
      <DashboardClient 
        jobs={jobs} 
        expenses={expenses} 
        customers={customers} 
        employees={employees} 
        categories={categories} 
      />
    </div>
  );
}
