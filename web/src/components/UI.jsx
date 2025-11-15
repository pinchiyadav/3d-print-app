import React from 'react';
import { Logo, XIcon } from './Icons';

export const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-100">
    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const ErrorMessage = ({ message, onClose }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
    <span className="block sm:inline">{message}</span>
    {onClose && (
      <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">
        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
      </button>
    )}
  </div>
);

export const SuccessMessage = ({ message, onClose }) => (
  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
    <span className="block sm:inline">{message}</span>
    <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">
      <svg className="fill-current h-6 w-6 text-green-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
    </button>
  </div>
);

export const AuthForm = ({ title, subtitle, onSubmit, loading, error, submitText, footer, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full">
      <div className="flex items-center justify-center mb-6">
        <Logo />
        <span className="text-2xl font-bold text-slate-800 ml-2">3D Prints</span>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        {error && <ErrorMessage message={error} onClose={() => {}} />}
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            {children}
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Processing...' : submitText}
            </button>
          </div>
        </form>
        <div className="text-center">
          {footer}
        </div>
      </div>
    </div>
  </div>
);

export const Input = ({ id, label, className = '', ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>}
    <input
      id={id}
      name={id}
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    />
  </div>
);

export const TextArea = ({ id, label, className = '', ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>
    <textarea
      id={id}
      name={id}
      rows="4"
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    ></textarea>
  </div>
);

export const Select = ({ id, label, className = '', children, ...props }) => (
  <div>
    {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
      {label}
    </label>}
    <select
      id={id}
      name={id}
      {...props}
      className={`w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${className}`}
    >
      {children}
    </select>
  </div>
);

export const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    gray: { bg: 'bg-slate-100', text: 'text-slate-600' },
  };
  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
      <h3 className="text-sm font-medium text-slate-500 truncate">{title}</h3>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
      <div className={`mt-3 p-3 rounded-full ${classes.bg} ${classes.text}`}>
        {icon}
      </div>
    </div>
  );
};

export const Th = ({ children }) => (
  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
    {children}
  </th>
);

export const Td = ({ children, ...props }) => (
  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800" {...props}>
    {children}
  </td>
);

export const StatusBadge = ({ status }) => {
  let colorClasses = '';
  switch (status.toLowerCase()) {
    case 'pending':
      colorClasses = 'bg-yellow-100 text-yellow-800';
      break;
    case 'printing':
      colorClasses = 'bg-blue-100 text-blue-800';
      break;
    case 'shipped':
      colorClasses = 'bg-indigo-100 text-indigo-800';
      break;
    case 'delivered':
    case 'earning':
      colorClasses = 'bg-green-100 text-green-800';
      break;
    case 'unaccepted':
    case 'penalty':
      colorClasses = 'bg-red-100 text-red-800';
      break;
    case 'paid':
    case 'payout':
      colorClasses = 'bg-blue-100 text-blue-800';
      break;
    case 'rejected':
      colorClasses = 'bg-slate-100 text-slate-800';
      break;
    case 'adjustment':
      colorClasses = 'bg-purple-100 text-purple-800';
      break;
    default:
      colorClasses = 'bg-slate-100 text-slate-800';
  }
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export const Modal = ({ children, onClose, title }) => (
  <div 
    className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <div 
      className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
          <XIcon />
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  </div>
);

export const InfoGroup = ({ title, children }) => (
  <div className="mt-4">
    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

export const InfoItem = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row">
    <span className="text-sm font-medium text-slate-500 w-32">{label}:</span>
    <span className="text-sm text-slate-800 flex-1">{value}</span>
  </div>
);

export const AdminNavItem = ({ title, active, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-4 font-medium text-sm focus:outline-none ${
      active
        ? 'border-b-2 border-blue-500 text-blue-600'
        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
    }`}
  >
    {title}
  </button>
);
