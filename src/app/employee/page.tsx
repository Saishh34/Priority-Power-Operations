import { getEmployeeData } from '@/actions/employee';
import { getEmployees } from '@/lib/airtable';
import EmployeeApp from './EmployeeApp';

import { Employee } from '@/types';

export default async function EmployeePage() {
  let initialData = null;
  let allEmployees: Employee[] = [];

  try {
    initialData = await getEmployeeData();
    if (!initialData) {
      allEmployees = (await getEmployees())
        .filter(e => e.active)
        .map(e => ({ ...e, pin: undefined }));
    }
  } catch (e) {
    // API not configured yet
    console.error(e);
  }

  return <EmployeeApp initialData={initialData} allEmployees={allEmployees} />;
}
