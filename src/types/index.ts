export interface Employee {
  id: string; // Airtable Record ID
  employeeId?: string; // Custom string ID if any
  name: string;
  mobile?: string;
  role: 'admin' | 'employee';
  pin?: string;
  active: boolean;
}

export interface Customer {
  id: string; // Airtable Record ID
  customerId?: string; // Custom string ID if any
  name: string;
  company?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface Job {
  id: string;
  jobId?: string;
  customerId: string;
  jobType: 'Repair' | 'Installation' | 'Maintenance' | 'Inspection' | 'Other';
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  visitDate?: string;
  assignedEmployeeIds: string[]; // one or more
  quotedAmount?: number;
  finalBilledAmount?: number;
  customerNotes?: string;
  createdBy?: string; // Employee ID or User
}

export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Expense {
  id: string;
  expenseId?: string;
  jobId: string;
  employeeId: string; // Field employee who submitted
  categoryId: string;
  amount: number;
  description?: string;
  paidBy: 'Employee' | 'Company';
  customerChargeable: 'Yes' | 'No' | 'Unknown';
  receiptUrl?: string;
  dateTime: string;
  status: 'Submitted' | 'Approved' | 'Rejected';
}
