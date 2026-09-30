'use server';

import { createCustomer as createAirtableCustomer, getCustomers } from '@/lib/airtable';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  if (cookieStore.get('employeeId')?.value) {
    throw new Error('Unauthorized: Employees cannot perform admin actions');
  }
  if (cookieStore.get('adminSession')?.value !== 'true') {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function adminAddCustomer(data: { name: string; company?: string; phone?: string; address?: string; notes?: string }) {
  await checkAdmin();
  if (!data.name?.trim()) {
    throw new Error('Name is required');
  }

  // Prevent duplicate by checking name (simple check)
  const customers = await getCustomers();
  const duplicate = customers.find(c => c.name.toLowerCase() === data.name.trim().toLowerCase() && c.phone === data.phone);
  if (duplicate) {
    throw new Error('A customer with this name and phone already exists.');
  }
  
  const customer = await createAirtableCustomer(data);
  revalidatePath('/admin/customers');
  return customer;
}

export async function adminAddJob(data: { customerId: string; jobType: 'Repair' | 'Installation' | 'Maintenance' | 'Inspection' | 'Other'; visitDate?: string; employeeIds: string[]; customerNotes?: string; quotedAmount?: number; finalBilledAmount?: number; }) {
  await checkAdmin();
  if (!data.customerId) {
    throw new Error('Customer is required');
  }
  if (!data.employeeIds || data.employeeIds.length === 0) {
    throw new Error('At least one employee must be assigned');
  }

  const { createJob: createAirtableJob } = await import('@/lib/airtable');
  const job = await createAirtableJob(data);
  revalidatePath('/admin/jobs');
  return job;
}

export async function adminAddExpense(data: {
  jobId: string;
  employeeId: string;
  categoryId: string;
  amount: number;
  description?: string;
  paidBy: 'Employee' | 'Company';
  customerChargeable: 'Yes' | 'No' | 'Unknown';
  dateTime: string;
  receiptBase64?: string;
  receiptFileName?: string;
}) {
  await checkAdmin();
  if (!data.jobId || !data.employeeId || !data.categoryId) {
    throw new Error('Job, Employee, and Category are required');
  }
  if (data.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const { createExpense: createAirtableExpense } = await import('@/lib/airtable');
  const expense = await createAirtableExpense(data);
  revalidatePath('/admin/expenses');
  return expense;
}
