"use client";

import { useState, useMemo } from 'react';
import { Job, Expense, Customer, Employee, ExpenseCategory } from '@/types';
import { formatKolkataDateTime } from '@/lib/dateUtils';

type DateFilter = 'Today' | 'This Week' | 'This Month' | 'Custom';

export default function DashboardClient({ jobs, expenses, customers, employees, categories }: {
  jobs: Job[];
  expenses: Expense[];
  customers: Customer[];
  employees: Employee[];
  categories: ExpenseCategory[];
}) {
  const [dateFilter, setDateFilter] = useState<DateFilter>('This Month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { filteredJobs, filteredExpenses } = useMemo(() => {
    const tzDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const tzDate = new Date(tzDateStr);
    tzDate.setHours(0, 0, 0, 0);
    const todayStart = tzDate.getTime();
    
    let start = 0;
    let end = Infinity;

    if (dateFilter === 'Today') {
      start = todayStart;
      end = start + 86400000;
    } else if (dateFilter === 'This Week') {
      const day = tzDate.getDay() || 7; 
      start = todayStart - (day - 1) * 86400000; // Monday start
      end = start + 7 * 86400000;
    } else if (dateFilter === 'This Month') {
      const firstDay = new Date(tzDate.getFullYear(), tzDate.getMonth(), 1);
      start = firstDay.getTime();
      const nextMonth = new Date(tzDate.getFullYear(), tzDate.getMonth() + 1, 1);
      end = nextMonth.getTime();
    } else if (dateFilter === 'Custom' && customStart && customEnd) {
      start = new Date(customStart).getTime();
      end = new Date(customEnd).getTime() + 86400000; // end of the selected day
    }

    const parseDate = (d?: string) => d ? new Date(d).getTime() : 0;
    
    const fJobs = jobs.filter(j => {
      const t = parseDate(j.visitDate);
      return t >= start && t < end;
    });

    const fExpenses = expenses.filter(e => {
      const t = parseDate(e.dateTime);
      return t >= start && t < end;
    });

    return { filteredJobs: fJobs, filteredExpenses: fExpenses };
  }, [jobs, expenses, dateFilter, customStart, customEnd]);

  // KPIs
  const revenue = filteredJobs.reduce((sum, j) => sum + (j.finalBilledAmount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const contribution = revenue - totalExpenses;
  const numJobs = filteredJobs.length;

  // Mixes
  const revenueMix = filteredJobs.reduce((acc, j) => {
    const type = j.jobType || 'Unknown';
    acc[type] = (acc[type] || 0) + (j.finalBilledAmount || 0);
    return acc;
  }, {} as Record<string, number>);

  const expenseMix = filteredExpenses.reduce((acc, e) => {
    const cat = categories.find(c => c.id === e.categoryId)?.name || 'Unknown';
    acc[cat] = (acc[cat] || 0) + (e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCustomers = filteredJobs.reduce((acc, j) => {
    const cName = customers.find(c => c.id === j.customerId)?.name || 'Unknown';
    acc[cName] = (acc[cName] || 0) + (j.finalBilledAmount || 0);
    return acc;
  }, {} as Record<string, number>);
  const sortedCustomers = Object.entries(topCustomers).sort((a,b) => b[1] - a[1]).slice(0,5);

  const empActivity = filteredJobs.reduce((acc, j) => {
    if (j.assignedEmployeeIds && Array.isArray(j.assignedEmployeeIds)) {
      j.assignedEmployeeIds.forEach(eid => {
        const eName = employees.find(e => e.id === eid)?.name || 'Unknown';
        acc[eName] = (acc[eName] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const recentActivity = [
    ...filteredJobs.map(j => ({ 
      type: 'Job', 
      date: j.visitDate || '', 
      title: `${j.jobType} Job - ${customers.find(c=>c.id===j.customerId)?.name || 'Unknown'}`, 
      amount: j.finalBilledAmount || 0 
    })),
    ...filteredExpenses.map(e => ({ 
      type: 'Expense', 
      date: e.dateTime, 
      title: `Expense: ${e.description || categories.find(c=>c.id===e.categoryId)?.name || 'Unknown'}`, 
      amount: e.amount || 0 
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  const formatDate = (dateStr: string) => formatKolkataDateTime(dateStr);

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200 items-center">
        <label className="font-medium text-sm text-slate-700">Date Range:</label>
        <select className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" value={dateFilter} onChange={e => setDateFilter(e.target.value as DateFilter)}>
          <option>Today</option>
          <option>This Week</option>
          <option>This Month</option>
          <option>Custom</option>
        </select>
        {dateFilter === 'Custom' && (
          <div className="flex items-center gap-2">
            <input type="date" className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            <span className="text-slate-500 font-medium">-</span>
            <input type="date" className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Revenue</div>
          <div className="text-2xl font-bold text-slate-900">{formatINR(revenue)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Expenses</div>
          <div className="text-2xl font-bold text-red-600">{formatINR(totalExpenses)}</div>
        </div>
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Est. Contribution</div>
          <div className="text-2xl font-bold text-blue-600">{formatINR(contribution)}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Jobs</div>
          <div className="text-2xl font-bold text-slate-900">{numJobs}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Revenue Mix</h2>
          <ul className="space-y-3">
            {Object.entries(revenueMix).map(([type, val]) => (
              <li key={type} className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{type}</span>
                <span className="font-medium text-slate-900">{formatINR(val)}</span>
              </li>
            ))}
            {Object.keys(revenueMix).length === 0 && <li className="text-slate-500 text-sm">No revenue data</li>}
          </ul>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Expense Mix</h2>
          <ul className="space-y-3">
            {Object.entries(expenseMix).map(([cat, val]) => (
              <li key={cat} className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{cat}</span>
                <span className="font-medium text-red-600">{formatINR(val)}</span>
              </li>
            ))}
            {Object.keys(expenseMix).length === 0 && <li className="text-slate-500 text-sm">No expense data</li>}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Top Customers</h2>
          <ul className="space-y-3">
            {sortedCustomers.map(([name, val]) => (
              <li key={name} className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{name}</span>
                <span className="font-medium text-slate-900">{formatINR(val)}</span>
              </li>
            ))}
            {sortedCustomers.length === 0 && <li className="text-slate-500 text-sm">No customer data</li>}
          </ul>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Employee Activity (Jobs Assigned)</h2>
          <ul className="space-y-3">
            {Object.entries(empActivity).map(([name, val]) => (
              <li key={name} className="flex justify-between items-center text-sm">
                <span className="text-slate-600">{name}</span>
                <span className="font-medium text-slate-900">{val} Job{val > 1 ? 's' : ''}</span>
              </li>
            ))}
            {Object.keys(empActivity).length === 0 && <li className="text-slate-500 text-sm">No activity data</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-3">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((act, i) => (
            <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
              <div>
                <div className="font-medium text-slate-900">{act.title}</div>
                <div className="text-xs text-slate-500">{formatDate(act.date)}</div>
              </div>
              <div className={`font-semibold ${act.type === 'Job' ? 'text-green-600' : 'text-red-600'}`}>
                {act.type === 'Job' ? '+' : '-'}{formatINR(act.amount)}
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && <div className="text-slate-500 text-sm py-2">No recent activity</div>}
        </div>
      </div>
    </div>
  );
}
