/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { login, logout, addCustomer, addJob, submitExpense } from '@/actions/employee';

function CreateCustomer({ onSave, onCancel }: any) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="bg-white text-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
      <h3 className="font-semibold text-lg text-gray-800 border-b pb-3 mb-4">Create Customer</h3>
      <input placeholder="Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Company" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={company} onChange={e => setCompany(e.target.value)} />
      <input placeholder="Phone" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={phone} onChange={e => setPhone(e.target.value)} />
      <div className="flex space-x-2">
        <button onClick={() => onSave({ name, company, phone })} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500">Save</button>
        <button onClick={onCancel} className="px-4 py-2 text-gray-600">Cancel</button>
      </div>
    </div>
  );
}

function CreateJob({ customers, employee, onSave, onCancel }: any) {
  const [custId, setCustId] = useState('');
  const [jobType, setJobType] = useState('Repair');
  const [quotedAmount, setQuotedAmount] = useState('');
  const [finalBilledAmount, setFinalBilledAmount] = useState('');
  return (
    <div className="bg-white text-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
      <h3 className="font-semibold text-lg text-gray-800 border-b pb-3 mb-4">Create Job</h3>
      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={custId} onChange={e => setCustId(e.target.value)}>
        <option value="">Select Customer</option>
        {customers.map((c: any) => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
      </select>
      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={jobType} onChange={e => setJobType(e.target.value)}>
        <option value="Repair">Repair</option>
        <option value="Installation">Installation</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Inspection">Inspection</option>
        <option value="Other">Other</option>
      </select>
      <input type="number" min="0" step="any" placeholder="Quoted / Agreed Amount (₹)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={quotedAmount} onChange={e => setQuotedAmount(e.target.value)} />
      <input type="number" min="0" step="any" placeholder="Final Billed Amount (₹)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={finalBilledAmount} onChange={e => setFinalBilledAmount(e.target.value)} />
      <div className="flex space-x-2">
        <button onClick={() => {
          const parsedQuoted = quotedAmount === '' ? undefined : Number(quotedAmount);
          const parsedFinal = finalBilledAmount === '' ? undefined : Number(finalBilledAmount);
          
          if (parsedQuoted !== undefined && (isNaN(parsedQuoted) || parsedQuoted < 0)) return alert('Quoted Amount must be a valid positive number');
          if (parsedFinal !== undefined && (isNaN(parsedFinal) || parsedFinal < 0)) return alert('Final Billed Amount must be a valid positive number');
          
          onSave({ customerId: custId, jobType, employeeIds: [employee.id], visitDate: new Date().toISOString().split('T')[0], quotedAmount: parsedQuoted, finalBilledAmount: parsedFinal })
        }} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500">Save</button>
        <button onClick={onCancel} className="px-4 py-2 text-gray-600">Cancel</button>
      </div>
    </div>
  );
}

function AddExpense({ categories, selectedJob, onSave, onCancel }: any) {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [paidBy, setPaidBy] = useState<'Employee'|'Company'>('Employee');
  const [chargeable, setChargeable] = useState<'Yes'|'No'|'Unknown'>('Unknown');
  const [receiptBase64, setReceiptBase64] = useState<string | undefined>(undefined);
  const [receiptFileName, setReceiptFileName] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) {
      setReceiptBase64(undefined);
      setReceiptFileName(undefined);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (max 5MB).");
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReceiptBase64(ev.target?.result as string);
      setReceiptFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!categoryId) return alert('Please select a category');
    if (isNaN(numAmount) || numAmount <= 0) return alert('Amount must be greater than zero');
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave({
        jobId: selectedJob,
        categoryId,
        amount: numAmount,
        description: desc,
        paidBy,
        customerChargeable: chargeable,
        dateTime: new Date().toISOString(),
        receiptBase64,
        receiptFileName,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white text-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
      <h3 className="font-semibold text-lg text-gray-800 border-b pb-3 mb-4">Add Expense</h3>
      <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
        <option value="">Select Category</option>
        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="number" placeholder="Amount (INR)" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={amount} onChange={e => setAmount(e.target.value)} />
      <input placeholder="Description" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={desc} onChange={e => setDesc(e.target.value)} />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Receipt Photo (Optional)</label>
        <input type="file" accept="image/*,.pdf" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" onChange={handleFileChange} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Paid By</label>
        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={paidBy} onChange={e => setPaidBy(e.target.value as any)}>
          <option value="Employee">Employee</option>
          <option value="Company">Company</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Chargeable?</label>
        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow" value={chargeable} onChange={e => setChargeable(e.target.value as any)}>
          <option value="Unknown">Unknown</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div className="flex space-x-2">
        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </button>
        <button onClick={onCancel} disabled={isSubmitting} className="px-4 py-2 text-gray-600 disabled:opacity-50">Cancel</button>
      </div>
    </div>
  );
}

export default function EmployeeApp({ initialData, allEmployees }: any) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<'login' | 'dashboard' | 'createCustomer' | 'createJob' | 'addExpense'>('dashboard');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [selectedJob, setSelectedJob] = useState('');

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4 bg-white text-gray-900 rounded shadow mt-10">
        <h2 className="text-xl font-bold">Employee Login</h2>
        {error && <p className="text-red-500">{error}</p>}
        <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow rounded" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
          <option value="">Select Employee</option>
          {allEmployees.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input type="password" placeholder="PIN" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-sm transition-shadow rounded" value={pin} onChange={e => setPin(e.target.value)} />
        <button className="w-full bg-blue-600 text-white p-2 rounded" onClick={async () => {
          try {
            await login(employeeId, pin);
            window.location.reload();
          } catch (e: any) {
            setError(e.message);
          }
        }}>Login</button>
      </div>
    );
  }

  const { employee, customers, jobs, categories } = data;

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white text-gray-900 p-6 rounded-xl shadow-md border border-gray-100">
        <div>
          <h2 className="text-xl font-bold">Welcome, {employee.name}</h2>
          <p className="text-gray-500 text-sm">Employee ID: {employee.employeeId}</p>
        </div>
        <button onClick={handleLogout} className="text-red-600 text-sm hover:underline">Logout</button>
      </div>

      <div className="bg-white text-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 space-y-5">
        <h3 className="font-semibold text-lg">My Active Jobs</h3>
        {jobs.length === 0 ? <p className="text-gray-500">No active jobs assigned to you.</p> : (
          <ul className="space-y-3">
            {jobs.map((job: any) => {
              const customer = customers.find((c: any) => c.id === job.customerId);
              return (
                <li key={job.id} className="border p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="font-medium">{job.jobType} at {customer?.company || customer?.name}</div>
                    <div className="text-sm text-gray-500">Status: {job.status}</div>
                  </div>
                  <button onClick={() => { setSelectedJob(job.id); setView('addExpense'); }} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Add Expense</button>
                </li>
              );
            })}
          </ul>
        )}
        
        <div className="pt-4 border-t flex space-x-3">
          <button onClick={() => setView('createCustomer')} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">New Customer</button>
          <button onClick={() => setView('createJob')} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm">New Job</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {view === 'dashboard' && renderDashboard()}
      
      {view === 'createCustomer' && (
        <CreateCustomer 
          onSave={async (payload: any) => {
            const cust = await addCustomer(payload);
            setData({ ...data, customers: [...customers, cust] });
            setView('dashboard');
          }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'createJob' && (
        <CreateJob 
          customers={customers}
          employee={employee}
          onSave={async (payload: any) => {
            const job = await addJob(payload);
            setData({ ...data, jobs: [...jobs, job] });
            setView('dashboard');
          }}
          onCancel={() => setView('dashboard')}
        />
      )}

      {view === 'addExpense' && (
        <AddExpense 
          categories={categories}
          selectedJob={selectedJob}
          employee={employee}
          onSave={async (payload: any) => {
             await submitExpense(payload);
             alert('Expense submitted!');
             setView('dashboard');
          }}
          onCancel={() => setView('dashboard')}
        />
      )}
    </div>
  );
}
