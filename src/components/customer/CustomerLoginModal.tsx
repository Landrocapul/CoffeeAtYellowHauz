import React, { useState } from 'react';
import { AppStore } from '../../services/store';
import { CustomerAccount } from '../../types';
import { X, User, Mail, Phone, Lock, Sparkles } from 'lucide-react';

interface CustomerLoginModalProps {
  onClose: () => void;
  onSuccess: (customer: CustomerAccount) => void;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password');
        return;
      }
      // Demo authentication: If customer matches existing or mock authenticates
      const mockCustomer: CustomerAccount = {
        id: Math.floor(100 + Math.random() * 900),
        fullName: fullName || (email && email.includes('@') ? email.split('@')[0].toUpperCase() : 'Customer'),
        email: email.trim(),
        contactNumber: contactNumber || '+63 917 000 0000',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      AppStore.setActiveCustomer(mockCustomer);
      onSuccess(mockCustomer);
      onClose();
    } else {
      if (!fullName.trim() || !email.trim() || !contactNumber.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      const newCustomer: CustomerAccount = {
        id: Math.floor(100 + Math.random() * 900),
        fullName: fullName.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      AppStore.setActiveCustomer(newCustomer);
      onSuccess(newCustomer);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Coffee at Yellow Hauz
            </span>
            <h3 className="text-xl font-bold text-stone-900 font-display">
              {mode === 'login' ? 'Welcome Back' : 'Create Customer Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Contact Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+63 912 345 6789"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-10 pr-4 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-stone-950 shadow-md hover:bg-amber-400 transition"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-stone-500">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-bold text-amber-700 hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-bold text-amber-700 hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
