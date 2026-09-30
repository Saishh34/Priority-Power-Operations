/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { cookies } from 'next/headers';
import { getEmployees, getCustomers, getJobs, getExpenseCategories, createExpense as createAirtableExpense, createCustomer as createAirtableCustomer, createJob as createAirtableJob } from '@/lib/airtable';
import { Expense } from '@/types';

export async function login(employeeId: string, pin: string) {
  const employees = await getEmployees();
  const emp = employees.find(e => e.id === employeeId && e.pin === pin);
  
  if (!emp) {
    throw new Error('Invalid employee or PIN');
  }
  
  (await cookies()).set('employeeId', emp.id, { httpOnly: true, path: '/' });
  return { success: true };
}

export async function logout() {
  (await cookies()).delete('employeeId');
}

export async function getSession() {
  const employeeId = (await cookies()).get('employeeId')?.value;
  if (!employeeId) return null;
  
  const employees = await getEmployees();
  return employees.find(e => e.id === employeeId) || null;
}

export async function addCustomer(data: { name: string; company?: string; phone?: string; address?: string; notes?: string }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return createAirtableCustomer(data);
}

export async function addJob(data: Omit<{ customerId: string; jobType: any; visitDate: string; employeeIds: string[]; customerNotes?: string; quotedAmount?: number; finalBilledAmount?: number; }, 'employeeIds'> & { employeeIds?: string[] }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const finalData = { ...data, employeeIds: data.employeeIds || [session.id] };
  return createAirtableJob(finalData);
}

export async function submitExpense(data: Omit<Expense, 'id' | 'expenseId' | 'status' | 'employeeId'> & { receiptBase64?: string, receiptFileName?: string }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  // Note: The backend does not yet support converting base64 directly to public URLs for Airtable attachments.
  // We pass the data without receiptUrl, fulfilling the necessary server-side function signature.
  const { receiptBase64, receiptFileName, ...expenseData } = data;
  
  return createAirtableExpense({ ...expenseData, receiptBase64, receiptFileName, employeeId: session.id } as any);
}

export async function getEmployeeData() {
  const session = await getSession();
  if (!session) return null;

  const [customers, jobs, categories] = await Promise.all([
    getCustomers(),
    getJobs(),
    getExpenseCategories()
  ]);

  const activeJobs = jobs.filter(j => j.status !== 'Completed' && j.status !== 'Cancelled' && j.assignedEmployeeIds?.includes(session.id));

  return {
    employee: session,
    customers,
    jobs: activeJobs,
    categories: categories.filter(c => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
