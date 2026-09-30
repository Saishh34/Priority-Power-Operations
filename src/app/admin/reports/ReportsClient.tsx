'use client';

  import { useState, useMemo, useCallback } from 'react';
  import { Expense, Job, Employee, Customer, ExpenseCategory } from '@/types';
  import { formatKolkataDateTime } from '@/lib/dateUtils';
  import { Download } from 'lucide-react';
  
  export default function ReportsClient({
    jobs,
    expenses,
    employees,
    categories,
    customers,
  }: {
    jobs: Job[];
    expenses: Expense[];
    employees: Employee[];
    categories: ExpenseCategory[];
    customers: Customer[];
  }) {
    // Filters
    const [dateRange, setDateRange] = useState('All'); // All, Today, This Week, This Month, Custom
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [jobTypeFilter, setJobTypeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [jobStatusFilter, setJobStatusFilter] = useState('');
    const [chargeableFilter, setChargeableFilter] = useState('');
  
    // Helpers
    const getJob = useCallback((id: string) => jobs.find(j => j.id === id), [jobs]);
    const getCustomer = useCallback((id: string) => customers.find(c => c.id === id), [customers]);
    const getEmployeeName = useCallback((id: string) => employees.find(e => e.id === id)?.name || 'Unknown', [employees]);
    const getCategoryName = useCallback((id: string) => categories.find(c => c.id === id)?.name || 'Unknown', [categories]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return expenses.filter(exp => {
      const job = getJob(exp.jobId);
      const customer = job ? getCustomer(job.customerId) : null;

      // Date Range
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

      if (customerFilter && customer?.id !== customerFilter) return false;
      if (employeeFilter && exp.employeeId !== employeeFilter) return false;
      if (jobTypeFilter && job?.jobType !== jobTypeFilter) return false;
      if (categoryFilter && exp.categoryId !== categoryFilter) return false;
      if (jobStatusFilter && job?.status !== jobStatusFilter) return false;
      if (chargeableFilter) {
        if (chargeableFilter === 'Chargeable' && exp.customerChargeable !== 'Yes') return false;
        if (chargeableFilter === 'Company' && exp.paidBy !== 'Company') return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCustomer, getJob are stable lookup functions
  }, [expenses, dateRange, customStartDate, customEndDate, customerFilter, employeeFilter, jobTypeFilter, categoryFilter, jobStatusFilter, chargeableFilter]);

  // Derived Job filtering based on filtered expenses
  // The PRD mentions Revenue and Jobs in the summary. Should we filter jobs that have an expense in this period, 
  // OR do we apply the same filters directly to Jobs?
  // Let's filter Jobs directly by the filters (except category/chargeable/employee which are expense-specific).
  // Wait, if an employee filter is selected, jobs without that employee shouldn't be counted in Revenue.
  // Safest is to get Jobs that are related to the filtered expenses OR directly match the filters.
  // Actually, PRD: "filters must work together, not independently".
  // Let's filter jobs that match the job-level filters AND date filters.
  const filteredJobs = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return jobs.filter(job => {
      // Date Range (using Visit Date)
      if (job.visitDate && dateRange !== 'All') {
        const jobDate = new Date(job.visitDate);
        if (dateRange === 'Today' && jobDate < today) return false;
        if (dateRange === 'This Week' && jobDate < thisWeekStart) return false;
        if (dateRange === 'This Month' && jobDate < thisMonthStart) return false;
        if (dateRange === 'Custom') {
          if (customStartDate && jobDate < new Date(customStartDate)) return false;
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (jobDate > end) return false;
          }
        }
      }

      if (customerFilter && job.customerId !== customerFilter) return false;
      if (jobTypeFilter && job.jobType !== jobTypeFilter) return false;
      if (jobStatusFilter && job.status !== jobStatusFilter) return false;
      
      // If employee filter is active, job must have this employee assigned
      if (employeeFilter && !job.assignedEmployeeIds?.includes(employeeFilter)) return false;

      // Category and Chargeable filters don't strictly apply to Jobs. 
      // If they are active, should we only count jobs that HAVE such expenses? 
      // Yes, if filtering by "Spare Part", revenue should only be from jobs that used spare parts.
      if (categoryFilter || chargeableFilter) {
        const hasMatchingExpense = expenses.some(exp => 
          exp.jobId === job.id && 
          (!categoryFilter || exp.categoryId === categoryFilter) &&
          (!chargeableFilter || (chargeableFilter === 'Chargeable' && exp.customerChargeable === 'Yes') || (chargeableFilter === 'Company' && exp.paidBy === 'Company'))
        );
        if (!hasMatchingExpense) return false;
      }

      return true;
    });
  }, [jobs, expenses, dateRange, customStartDate, customEndDate, customerFilter, employeeFilter, jobTypeFilter, jobStatusFilter, categoryFilter, chargeableFilter]);

  // Summaries
  const totalRevenue = filteredJobs.reduce((sum, job) => sum + (job.finalBilledAmount || job.quotedAmount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const estimatedContribution = totalRevenue - totalExpenses;

  // Breakdowns
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    const catName = getCategoryName(exp.categoryId);
    acc[catName] = (acc[catName] || 0) + (exp.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const expensesByEmployee = filteredExpenses.reduce((acc, exp) => {
    const empName = getEmployeeName(exp.employeeId);
    acc[empName] = (acc[empName] || 0) + (exp.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const revenueByJobType = filteredJobs.reduce((acc, job) => {
    const type = job.jobType || 'Other';
    acc[type] = (acc[type] || 0) + (job.finalBilledAmount || job.quotedAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  const exportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No expenses to export for the selected filters.");
      return;
    }

    const headers = [
      "Expense ID", "Job", "Customer", "Employee", "Job Type", "Job Status",
      "Category", "Amount", "Paid By", "Customer Chargeable", "Description",
      "Date/Time", "Expense Status"
    ];

    const rows = filteredExpenses.map(exp => {
      const job = getJob(exp.jobId);
      const customer = job ? getCustomer(job.customerId) : null;
      
      const row = [
        exp.expenseId || "No ID",
        job?.jobId || "Unnamed Job",
        customer?.name || "-",
        getEmployeeName(exp.employeeId),
        job?.jobType || "-",
        job?.status || "-",
        getCategoryName(exp.categoryId),
        exp.amount || 0,
        exp.paidBy || "-",
        exp.customerChargeable || "-",
        (exp.description || "-").replace(/"/g, '""'), // escape quotes
        exp.dateTime ? formatKolkataDateTime(exp.dateTime) : "-",
        exp.status || "-"
      ];
      return `"${row.join('","')}"`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    let dateStr = dateRange;
    if (dateRange === 'Custom') dateStr = `${customStartDate}_to_${customEndDate}`;
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${dateStr.replace(/ /g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
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
          }}
          className="px-2 py-1 text-sm text-blue-600 hover:underline"
        >
          Clear Filters
        </button>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={exportCSV}
          disabled={filteredExpenses.length === 0}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-all focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex items-center gap-2 text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Revenue</h3>
          <p className="text-2xl font-bold text-slate-900">₹{totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">From {filteredJobs.length} Jobs</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Expenses</h3>
          <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">From {filteredExpenses.length} Expense Records</p>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Estimated Contribution</h3>
          <p className="text-2xl font-bold text-blue-600">₹{estimatedContribution.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">Revenue minus Expenses</p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Revenue by Job Type</h3>
          {Object.keys(revenueByJobType).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(revenueByJobType).sort((a,b)=>b[1]-a[1]).map(([type, amt]) => (
                <li key={type} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{type}</span>
                  <span className="font-medium text-slate-900">₹{amt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No revenue data</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Expenses by Category</h3>
          {Object.keys(expensesByCategory).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(expensesByCategory).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => (
                <li key={cat} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{cat}</span>
                  <span className="font-medium text-red-600">₹{amt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No expense data</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Expenses by Employee</h3>
          {Object.keys(expensesByEmployee).length > 0 ? (
            <ul className="space-y-3">
              {Object.entries(expensesByEmployee).sort((a,b)=>b[1]-a[1]).map(([emp, amt]) => (
                <li key={emp} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{emp}</span>
                  <span className="font-medium text-red-600">₹{amt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No expense data</p>
          )}
        </div>
      </div>

    </div>
  );
}
