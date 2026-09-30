import { getJobs, getCustomers, getEmployees } from '@/lib/airtable';
import JobsClient from './JobsClient';

export default async function AdminJobsPage() {
  const [jobs, customers, employees] = await Promise.all([
    getJobs(),
    getCustomers(),
    getEmployees(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Jobs</h1>
      <JobsClient initialJobs={jobs} customers={customers} employees={employees} />
    </div>
  );
}
