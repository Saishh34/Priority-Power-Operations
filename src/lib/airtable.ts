import { Employee, Customer, Job, Expense, ExpenseCategory } from '../types';

// Ensure this file is only used on the server
import 'server-only';

async function fetchAirtable(table: string, options: RequestInit = {}) {
  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  if (!API_KEY || !BASE_ID) {
    throw new Error('Airtable credentials are not configured');
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

// 1. Employees
export async function getEmployees(): Promise<Employee[]> {
  const data = await fetchAirtable('Employees');
  return data.records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((record: any) => Object.keys(record.fields).length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((record: any) => ({
      id: record.id,
      employeeId: record.fields['Employee ID'],
      name: record.fields.Name || '',
      mobile: record.fields.Mobile,
      role: record.fields.Role || 'employee',
      pin: record.fields['PIN/Auth identifier'],
      active: record.fields.Active ?? true,
    }));
}

// 2. Customers
export async function getCustomers(): Promise<Customer[]> {
  const data = await fetchAirtable('Customers');
  const customersToUpdate: { id: string, customerId: string }[] = [];

  const customers = data.records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((record: any) => Object.keys(record.fields).length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((record: any) => {
      let customerId = record.fields['Customer ID'];
      if (!customerId) {
        const year = record.createdTime ? new Date(record.createdTime).getFullYear() : new Date().getFullYear();
        const suffix = Math.floor(10000 + Math.random() * 90000);
        customerId = `CUST-${year}-${suffix}`;
        customersToUpdate.push({ id: record.id, customerId });
      }
      return {
        id: record.id,
        customerId,
        name: record.fields.Name || '',
        company: record.fields.Company,
        phone: record.fields.Phone,
        address: record.fields.Address,
        notes: record.fields.Notes,
      };
    });

  if (customersToUpdate.length > 0) {
    for (let i = 0; i < customersToUpdate.length; i += 10) {
      const chunk = customersToUpdate.slice(i, i + 10);
      const payload = {
        records: chunk.map(c => ({
          id: c.id,
          fields: {
            'Customer ID': c.customerId
          }
        }))
      };
      await fetchAirtable('Customers', { method: 'PATCH', body: JSON.stringify(payload) }).catch(e => console.error('Failed to backfill Customer IDs', e));
    }
  }
  
  return customers;
}

// 3. Jobs
export async function getJobs(): Promise<Job[]> {
  const data = await fetchAirtable('Jobs');
  const jobsToUpdate: { id: string, jobId: string }[] = [];

  const jobs = data.records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((record: any) => record.fields.Customer && record.fields.Customer.length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((record: any) => {
      let jobId = record.fields['Job ID'];
      if (!jobId) {
        const year = record.createdTime ? new Date(record.createdTime).getFullYear() : new Date().getFullYear();
        const suffix = Math.floor(10000 + Math.random() * 90000);
        jobId = `JOB-${year}-${suffix}`;
        jobsToUpdate.push({ id: record.id, jobId });
      }
      return {
        id: record.id,
        jobId,
        customerId: record.fields.Customer[0],
        jobType: record.fields['Job Type'] || 'Other',
        status: record.fields.Status || 'Open',
        visitDate: record.fields['Visit Date'],
        assignedEmployeeIds: record.fields['Assigned Employees'] || [],
        quotedAmount: record.fields['Quoted/Agreed Amount'],
        finalBilledAmount: record.fields['Final Billed Amount'],
        customerNotes: record.fields['Customer Notes'],
        createdBy: record.fields['Created By'],
      };
    });

  if (jobsToUpdate.length > 0) {
    // Airtable allows up to 10 records per request
    for (let i = 0; i < jobsToUpdate.length; i += 10) {
      const chunk = jobsToUpdate.slice(i, i + 10);
      const payload = {
        records: chunk.map(j => ({
          id: j.id,
          fields: {
            'Job ID': j.jobId
          }
        }))
      };
      // Fire and forget or await
      await fetchAirtable('Jobs', { method: 'PATCH', body: JSON.stringify(payload) }).catch(e => console.error('Failed to backfill Job IDs', e));
    }
  }

  return jobs;
}

// 4. Expense Categories
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const data = await fetchAirtable('Expense Categories');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.records.map((record: any) => ({
    id: record.id,
    name: record.fields.Name || '',
    active: record.fields.Active ?? true,
    sortOrder: record.fields['Sort Order'] || 0,
  }));
}

// 5. Expenses
export async function getExpenses(): Promise<Expense[]> {
  const data = await fetchAirtable('Expenses');
  const expensesToUpdate: { id: string, expenseId: string }[] = [];

  const expenses = data.records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((record: any) => record.fields.Job && record.fields.Job.length > 0 && record.fields.Employee && record.fields.Employee.length > 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((record: any) => {
      let expenseId = record.fields['Expense ID'];
      if (!expenseId) {
        const year = record.createdTime ? new Date(record.createdTime).getFullYear() : new Date().getFullYear();
        const suffix = Math.floor(10000 + Math.random() * 90000);
        expenseId = `EXP-${year}-${suffix}`;
        expensesToUpdate.push({ id: record.id, expenseId });
      }
      return {
        id: record.id,
        expenseId,
        jobId: record.fields.Job[0],
        employeeId: record.fields.Employee[0],
        categoryId: record.fields.Category ? record.fields.Category[0] : '',
        amount: record.fields.Amount || 0,
        description: record.fields.Description,
        paidBy: record.fields['Paid By'] || 'Employee',
        customerChargeable: record.fields['Customer Chargeable'] || 'Unknown',
        receiptUrl: record.fields.Receipt && record.fields.Receipt.length > 0 ? record.fields.Receipt[0].url : undefined,
        dateTime: record.fields['Date/Time'] || '',
        status: record.fields.Status || 'Submitted',
      };
    });

  if (expensesToUpdate.length > 0) {
    for (let i = 0; i < expensesToUpdate.length; i += 10) {
      const chunk = expensesToUpdate.slice(i, i + 10);
      const payload = {
        records: chunk.map(e => ({
          id: e.id,
          fields: {
            'Expense ID': e.expenseId
          }
        }))
      };
      await fetchAirtable('Expenses', { method: 'PATCH', body: JSON.stringify(payload) }).catch(err => console.error('Failed to backfill Expense IDs', err));
    }
  }

  return expenses;
}

export async function createExpense(expenseData: Omit<Expense, 'id' | 'expenseId' | 'status'> & { receiptBase64?: string, receiptFileName?: string }): Promise<Expense> {
  // Validation
  if (!expenseData.employeeId) {
    throw new Error('Employee ID is required');
  }
  if (!expenseData.jobId) {
    throw new Error('Job ID is required');
  }
  if (!expenseData.categoryId) {
    throw new Error('Category ID is required');
  }
  if (expenseData.amount <= 0) {
    throw new Error('Expense amount must be a positive INR amount');
  }

  const year = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  const generatedExpenseId = `EXP-${year}-${suffix}`;

  const payload = {
    records: [
      {
        fields: {
          'Expense ID': generatedExpenseId,
          'Job': [expenseData.jobId],
          'Employee': [expenseData.employeeId],
          'Category': [expenseData.categoryId],
          'Amount': expenseData.amount,
          'Description': expenseData.description || '',
          'Paid By': expenseData.paidBy,
          'Customer Chargeable': expenseData.customerChargeable,
          'Date/Time': expenseData.dateTime,
          'Status': 'Submitted',
        }
      }
    ]
  };

  const response = await fetchAirtable('Expenses', {
    method: 'POST',

    body: JSON.stringify(payload),
  });

  const record = response.records[0];

  // Upload receipt attachment if provided
  if (expenseData.receiptBase64 && expenseData.receiptFileName) {
    const API_KEY = process.env.AIRTABLE_API_KEY;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const match = expenseData.receiptBase64.match(/^data:(.+);base64,(.*)$/);
    if (match && API_KEY && BASE_ID) {
      const contentType = match[1];
      const base64Data = match[2];
      const uploadUrl = `https://content.airtable.com/v0/${BASE_ID}/${record.id}/Receipt/uploadAttachment`;

      try {
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contentType,
            file: base64Data,
            filename: expenseData.receiptFileName
          })
        });

        if (!uploadRes.ok) {
          console.error("Failed to upload attachment:", await uploadRes.text());
        }
      } catch (err) {
        console.error("Error uploading attachment:", err);
      }
    }
  }

  return {
    id: record.id,
    expenseId: record.fields['Expense ID'] || generatedExpenseId,
    jobId: expenseData.jobId,
    employeeId: expenseData.employeeId,
    categoryId: expenseData.categoryId,
    amount: expenseData.amount,
    description: expenseData.description,
    paidBy: expenseData.paidBy,
    customerChargeable: expenseData.customerChargeable,
    dateTime: expenseData.dateTime,
    status: 'Submitted',
    receiptUrl: undefined, // Usually fetched on reload
  };
}

export async function createCustomer(data: { name: string; company?: string; phone?: string; address?: string; notes?: string }): Promise<Customer> {
  const year = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  const generatedCustomerId = `CUST-${year}-${suffix}`;

  const payload = {
    records: [{
      fields: {
        'Customer ID': generatedCustomerId,
        'Name': data.name,
        'Company': data.company || '',
        'Phone': data.phone || '',
        'Address': data.address || '',
        'Notes': data.notes || '',
      }
    }]
  };
  const response = await fetchAirtable('Customers', { method: 'POST', body: JSON.stringify(payload) });
  const record = response.records[0];
  return {
    id: record.id,
    customerId: record.fields['Customer ID'] || generatedCustomerId,
    name: record.fields.Name || '',
    company: record.fields.Company,
    phone: record.fields.Phone,
    address: record.fields.Address,
    notes: record.fields.Notes,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createJob(data: { customerId: string; jobType: any; visitDate?: string; employeeIds: string[]; customerNotes?: string; quotedAmount?: number; finalBilledAmount?: number; }): Promise<Job> {
  const year = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  const jobId = `JOB-${year}-${suffix}`;

  const payload = {
    records: [{
      fields: {
        'Job ID': jobId,
        'Customer': [data.customerId],
        'Job Type': data.jobType,
        'Visit Date': data.visitDate || '',
        'Assigned Employees': data.employeeIds,
        'Customer Notes': data.customerNotes || '',
        'Status': 'Open',
        ...(data.quotedAmount !== undefined ? { 'Quoted/Agreed Amount': data.quotedAmount } : {}),
        ...(data.finalBilledAmount !== undefined ? { 'Final Billed Amount': data.finalBilledAmount } : {}),
      }
    }]
  };
  const response = await fetchAirtable('Jobs', { method: 'POST', body: JSON.stringify(payload) });
  const record = response.records[0];
  return {
    id: record.id,
    jobId: record.fields['Job ID'] || jobId,
    customerId: data.customerId,
    jobType: data.jobType,
    status: 'Open',
    visitDate: data.visitDate,
    assignedEmployeeIds: data.employeeIds,
    customerNotes: data.customerNotes,
    quotedAmount: data.quotedAmount,
    finalBilledAmount: data.finalBilledAmount,
  };
}

