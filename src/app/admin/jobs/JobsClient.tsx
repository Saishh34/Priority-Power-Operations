'use client';

import { useState } from 'react';
import { Job, Customer, Employee } from '@/types';
import { adminAddJob } from '@/actions/admin';
import { formatKolkataDate } from '@/lib/dateUtils';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function JobsClient({
  initialJobs,
  customers,
  employees,
}: {
  initialJobs: Job[];
  customers: Customer[];
  employees: Employee[];
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  // Filters
  const [customerFilter, setCustomerFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Job Form State
  const [formData, setFormData] = useState({
    customerId: '',
    jobType: 'Repair' as Job['jobType'],
    visitDate: '',
    employeeIds: [] as string[],
    quotedAmount: '' as string | number,
    finalBilledAmount: '' as string | number,
    customerNotes: '',
  });

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown Customer';
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Unknown Employee';

  const filteredJobs = jobs.filter(j => {
    if (customerFilter && j.customerId !== customerFilter) return false;
    if (employeeFilter && !j.assignedEmployeeIds.includes(employeeFilter)) return false;
    if (jobTypeFilter && j.jobType !== jobTypeFilter) return false;
    if (statusFilter && j.status !== statusFilter) return false;
    if (dateFilter && j.visitDate !== dateFilter) return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Customer is required');
      return;
    }
    if (formData.employeeIds.length === 0) {
      toast.error('At least one employee must be assigned');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedQuoted = formData.quotedAmount === '' ? undefined : Number(formData.quotedAmount);
      const parsedFinal = formData.finalBilledAmount === '' ? undefined : Number(formData.finalBilledAmount);

      if (parsedQuoted !== undefined && (isNaN(parsedQuoted) || parsedQuoted < 0)) {
        toast.error('Quoted Amount must be a valid positive number');
        setIsSubmitting(false);
        return;
      }
      if (parsedFinal !== undefined && (isNaN(parsedFinal) || parsedFinal < 0)) {
        toast.error('Final Billed Amount must be a valid positive number');
        setIsSubmitting(false);
        return;
      }

      const newJob = await adminAddJob({
        ...formData,
        quotedAmount: parsedQuoted,
        finalBilledAmount: parsedFinal,
      });
      setJobs(prev => [newJob, ...prev]);
      setIsModalOpen(false);
      setFormData({
        customerId: '',
        jobType: 'Repair',
        visitDate: '',
        employeeIds: [],
        quotedAmount: '',
        finalBilledAmount: '',
        customerNotes: '',
      });
      toast.success('Job created successfully');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleEmployee = (empId: string) => {
    setFormData(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(empId)
        ? prev.employeeIds.filter(id => id !== empId)
        : [...prev.employeeIds, empId]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-3 flex-1">
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          >
            <option value="">All Customers</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          >
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select
            value={jobTypeFilter}
            onChange={(e) => setJobTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          >
            <option value="">All Job Types</option>
            <option value="Repair">Repair</option>
            <option value="Installation">Installation</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inspection">Inspection</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          />
          <button 
            onClick={() => {
              setCustomerFilter('');
              setEmployeeFilter('');
              setJobTypeFilter('');
              setStatusFilter('');
              setDateFilter('');
            }}
            className="px-3 py-2 text-sm text-blue-600 hover:underline font-medium"
          >
            Clear Filters
          </button>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium whitespace-nowrap shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Job
        </button>
      </div>

      {/* Jobs Table */}
      {filteredJobs.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-lg border">
          No jobs found matching your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Job ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Visit Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Employees</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Quoted</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-right">Final</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap font-mono">
                      {job.jobId ? job.jobId : <span className="italic text-gray-400">No ID</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{getCustomerName(job.customerId)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{job.jobType}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        job.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        job.status === 'Cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatKolkataDate(job.visitDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {job.assignedEmployeeIds && job.assignedEmployeeIds.length > 0 
                        ? job.assignedEmployeeIds.map(id => getEmployeeName(id)).join(', ')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                      {job.quotedAmount != null ? `₹${Number(job.quotedAmount).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {job.finalBilledAmount != null ? `₹${Number(job.finalBilledAmount).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={job.customerNotes}>{job.customerNotes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 z-50 overflow-hidden">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full">
            <div className="px-6 py-4 border-b shrink-0 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-slate-900">New Job</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                <span className="sr-only">Close</span>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
            
              <form id="new-job-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Type *</label>
                <select
                  required
                  value={formData.jobType}
                  onChange={(e) => setFormData({...formData, jobType: e.target.value as Job['jobType']})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                >
                  <option value="Repair">Repair</option>
                  <option value="Installation">Installation</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Visit Date</label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign Employees *</label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                  {employees.map(emp => (
                    <label key={emp.id} className="flex items-center space-x-2 p-1 hover:bg-blue-50/30 transition-colors rounded cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.employeeIds.includes(emp.id)}
                        onChange={() => toggleEmployee(emp.id)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quoted / Agreed Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.quotedAmount}
                  onChange={(e) => setFormData({...formData, quotedAmount: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Final Billed Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.finalBilledAmount}
                  onChange={(e) => setFormData({...formData, finalBilledAmount: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Notes</label>
                <textarea
                  value={formData.customerNotes}
                  onChange={(e) => setFormData({...formData, customerNotes: e.target.value})}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] bg-white shadow-sm text-sm transition-shadow"
                  placeholder="Additional details..."
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
                form="new-job-form"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Saving...
                  </>
                ) : 'Save Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
