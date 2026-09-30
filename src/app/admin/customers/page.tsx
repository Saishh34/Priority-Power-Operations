import { getCustomers } from '@/lib/airtable';
import CustomersClient from './CustomersClient';

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
