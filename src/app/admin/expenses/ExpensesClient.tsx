'use client';

import { useState, useMemo } from 'react';
import { Expense, Job, Employee, Customer, ExpenseCategory } from '@/types';
import { adminAddExpense } from '@/actions/admin';
import { useRouter } from 'next/navigation';
import { formatKolkataDateTime } from '@/lib/dateUtils';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesClient({
  initialExpenses,
  jobs,
  employees,
  categories,
  customers,
}: {
  initialExpenses: Expense[];
  jobs: Job[];
  employees: Employee[];
  categories: ExpenseCategory[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('All'); // All, Today, This Week, This Month, Custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState('');
  const [chargeableFilter, setChargeableFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Expense Form State
  const [formData, setFormData] = useState({
    jobId: '',
    employeeId: '',
    categoryId: '',
    amount: '',
    description: '',
    paidBy: 'Employee' as 'Employee' | 'Company',
    customerChargeable: 'Unknown' as 'Yes' | 'No' | 'Unknown',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Helpers
  const getJob = (id: string) => jobs.find(j => j.id === id);
  const getCustomer = (id: string) => customers.find(c => c.id === id);
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown';
  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobId || !formData.employeeId || !formData.categoryId) {
      toast.error('Job, Employee, and Category are required');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    setIsSubmitting(true);

    try {
      let receiptBase64 = undefined;
      let receiptFileName = undefined;
      
      if (receiptFile) {
        receiptBase64 = await toBase64(receiptFile);
        receiptFileName = receiptFile.name;
      }

      const newExpense = await adminAddExpense({
        jobId: formData.jobId,
        employeeId: formData.employeeId,
        categoryId: formData.categoryId,
        amount: amt,
        description: formData.description,
        paidBy: formData.paidBy,
        customerChargeable: formData.customerChargeable,
        dateTime: new Date().toISOString(),
        receiptBase64,
        receiptFileName,
      });

      setExpenses(prev => [newExpense, ...prev]);
      setIsModalOpen(false);
      setFormData({
        jobId: '',
        employeeId: '',
        categoryId: '',
        amount: '',
        description: '',
        paidBy: 'Employee',
        customerChargeable: 'Unknown',
      });
      setReceiptFile(null);
      toast.success('Expense added successfully');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // start of week (Sunday)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    // start of month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter(exp => {
      const job = getJob(exp.jobId);
      const customer = job ? getCustomer(job.customerId) : null;

      // 1. Search Term (Expense ID, Job ID, Employee Name, Description, Customer Name)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          (exp.expenseId || '').toLowerCase().includes(search) ||
          (job?.jobId || '').toLowerCase().includes(search) ||
          getEmployeeName(exp.employeeId).toLowerCase().includes(search) ||
          (exp.description || '').toLowerCase().includes(search) ||
          (customer?.name || '').toLowerCase().includes(search);
        
        if (!matches) return false;
      }

      // 2. Date Range
      if (exp.dateTime && dateRange !== 'All') {
        const expDate = new Date(exp.dateTime);
        if (dateRange === 'Today' && expDate < today) return false;
        if (dateRange === 'This Week' && expDate < thisWeekStart) return false;
        if (dateRange === 'This Month' && expDate < thisMonthStart) return false;
        if (dateRange === 'Custom') {
          if (customStartDate && expDate < new Date(customStartDate)) return false;
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (expDate > end) return false;
          }
        }
      }

      // 3. Customer Filter
      if (customerFilter && customer?.id !== customerFilter) return false;

      // 4. Employee Filter
      if (employeeFilter && exp.employeeId !== employeeFilter) return false;

      // 5. Job Type Filter
      if (jobTypeFilter && job?.jobType !== jobTypeFilter) return false;

      // 6. Expense Category Filter
      if (categoryFilter && exp.categoryId !== categoryFilter) return false;

      // 7. Job Status Filter
      if (jobStatusFilter && job?.status !== jobStatusFilter) return false;

      // 8. Chargeable vs Company
      if (chargeableFilter) {
        // "Chargeable": customerChargeable is Yes OR Paid By is Company?
        // Wait, Chargeable means customerChargeable === 'Yes'. Company Expense means Paid By === 'Company'?
        // PRD says: "Chargeable vs Company Expense"
        if (chargeableFilter === 'Chargeable' && exp.customerChargeable !== 'Yes') return false;
        if (chargeableFilter === 'Company' && exp.paidBy !== 'Company') return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCustomer, getEmployeeName, getJob are stable lookup functions
  }, [expenses, searchTerm, dateRange, customStartDate, customEndDate, customerFilter, employeeFilter, jobTypeFilter, categoryFilter, jobStatusFilter, chargeableFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  }, [filteredExpenses]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-slate-900 whitespace-nowrap bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
            Total: ₹{totalAmount.toLocaleString()}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Expense
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
          <option value="All">All Dates</option>
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="Custom">Custom</option>
        </select>
        
        {dateRange === 'Custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
            <span className="text-slate-500 font-medium">to</span>
            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
          </div>
        )}

        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow max-w-[150px]">
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        
        <select value={jobTypeFilter} onChange={(e) => setJobTypeFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
          <option value="">All Job Types</option>
          <option value="Repair">Repair</option>
          <option value="Installation">Installation</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Inspection">Inspection</option>
          <option value="Other">Other</option>
        </select>
        
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow max-w-[150px]">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <select value={jobStatusFilter} onChange={(e) => setJobStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
          <option value="">All Job Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        
        <select value={chargeableFilter} onChange={(e) => setChargeableFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow">
          <option value="">All Expenses</option>
          <option value="Chargeable">Chargeable to Customer</option>
          <option value="Company">Paid by Company</option>
        </select>
        
        <button 
          onClick={() => {
            setDateRange('All');
            setCustomStartDate('');
            setCustomEndDate('');
            setCustomerFilter('');
            setEmployeeFilter('');
            setJobTypeFilter('');
            setCategoryFilter('');
            setJobStatusFilter('');
            setChargeableFilter('');
            setSearchTerm('');
          }}
          className="px-2 py-1 text-sm text-blue-600 hover:underline"
        >
          Clear Filters
        </button>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          No expenses found matching your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Expense ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Date/Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Job</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Paid By</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Chargeable</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Receipt</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map(exp => {
                  const job = getJob(exp.jobId);
                  const customer = job ? getCustomer(job.customerId) : null;
                  const dateStr = formatKolkataDateTime(exp.dateTime);
                  
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap font-mono">{exp.expenseId || <span className="italic text-slate-400">No ID</span>}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{getEmployeeName(exp.employeeId)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{job?.jobId || <span className="italic text-slate-400">Unnamed Job</span>}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{customer?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{getCategoryName(exp.categoryId)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">{exp.amount}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{exp.paidBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {exp.customerChargeable === 'Yes' ? (
                          <span className="text-green-600 font-medium">Yes</span>
                        ) : exp.customerChargeable}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          exp.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {exp.receiptUrl ? (
                          <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View Receipt
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={exp.description}>{exp.description || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full">
            <div className="px-6 py-4 border-b shrink-0 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-slate-900">New Expense</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <span className="sr-only">Close</span>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
            
            <form id="new-expense-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Job *</label>
                <select
                  required
                  value={formData.jobId}
                  onChange={(e) => setFormData({...formData, jobId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="">Select a job...</option>
                  {jobs.map(j => {
                    const cName = getCustomer(j.customerId)?.name || 'Unknown';
                    return <option key={j.id} value={j.id}>{j.jobId || j.id} ({cName})</option>
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="">Select an employee...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="">Select a category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Paid By *</label>
                <select
                  required
                  value={formData.paidBy}
                  onChange={(e) => setFormData({...formData, paidBy: e.target.value as 'Employee' | 'Company'})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="Employee">Employee</option>
                  <option value="Company">Company</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Chargeable *</label>
                <select
                  required
                  value={formData.customerChargeable}
                  onChange={(e) => setFormData({...formData, customerChargeable: e.target.value as 'Yes' | 'No' | 'Unknown'})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Receipt (Optional)</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] bg-white shadow-sm text-sm transition-shadow"
                />
              </div>
              
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl shrink-0 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  form="new-expense-form"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50 flex items-center"
                >
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
