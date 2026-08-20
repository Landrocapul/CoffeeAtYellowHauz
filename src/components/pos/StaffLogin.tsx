import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../../types';
import { AppStore } from '../../services/store';
import { Shield, Coffee, KeyRound, Delete, ArrowRight, Sparkles, UserCheck, Users } from 'lucide-react';

interface StaffLoginProps {
  onLoginSuccess: (user: User) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'cashier' | 'admin'>('cashier');
  const [error, setError] = useState('');
  const [selectedStaffUser, setSelectedStaffUser] = useState<User | null>(null);

  const allUsers = useMemo(() => {
    return AppStore.getUsers();
  }, []);

  const activeCashiers = useMemo(() => {
    return allUsers.filter((u) => u.role === 'cashier' && u.status === 'active');
  }, [allUsers]);

  const activeAdmins = useMemo(() => {
    return allUsers.filter((u) => u.role === 'admin' && u.status === 'active');
  }, [allUsers]);

  const submitWithPin = useCallback(
    (enteredPin: string, selectedRole: 'cashier' | 'admin', specificUser?: User | null) => {
      const usersList = AppStore.getUsers();

      // If a specific staff was clicked/chosen
      if (specificUser) {
        const currentData = usersList.find((u) => u.id === specificUser.id) || specificUser;
        if (currentData.status === 'inactive') {
          setError(`Account for ${currentData.fullName} is inactive. Contact the administrator.`);
          return;
        }
        const userPin = currentData.pin || (currentData.role === 'admin' ? '1234' : '0000');
        if (enteredPin === userPin || (enteredPin === '0000' && currentData.role === 'cashier') || (enteredPin === '1234' && currentData.role === 'admin')) {
          AppStore.setActiveStaff(currentData);
          onLoginSuccess(currentData);
          return;
        } else {
          setError(`Incorrect PIN for ${currentData.fullName}.`);
          return;
        }
      }

      // Check matching user by entered PIN and role
      const matchingActiveUser = usersList.find((u) => {
        if (u.status === 'inactive') return false;
        const userPin = u.pin || (u.role === 'admin' ? '1234' : '0000');
        return userPin === enteredPin && u.role === selectedRole;
      });

      if (matchingActiveUser) {
        AppStore.setActiveStaff(matchingActiveUser);
        onLoginSuccess(matchingActiveUser);
        return;
      }

      // Fallback check across all active users regardless of tab
      const fallbackUser = usersList.find((u) => {
        if (u.status === 'inactive') return false;
        const userPin = u.pin || (u.role === 'admin' ? '1234' : '0000');
        return userPin === enteredPin;
      });

      if (fallbackUser) {
        AppStore.setActiveStaff(fallbackUser);
        onLoginSuccess(fallbackUser);
        return;
      }

      // Check if pin matches an inactive user
      const inactiveMatch = usersList.find((u) => {
        const userPin = u.pin || (u.role === 'admin' ? '1234' : '0000');
        return userPin === enteredPin;
      });

      if (inactiveMatch) {
        setError(`The account for ${inactiveMatch.fullName} is currently inactive.`);
        return;
      }

      setError(`Invalid PIN. Please check your 4-digit security PIN.`);
    },
    [onLoginSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;
        setError('');
        if (next.length === 4) {
          // Auto-check PIN when 4 digits reached
          setTimeout(() => {
            submitWithPin(next, role, selectedStaffUser);
          }, 100);
        }
        return next;
      });
    },
    [role, selectedStaffUser, submitWithPin]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError('');
  }, []);

  // Support physical keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          submitWithPin(pin, role, selectedStaffUser);
        }
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear, pin, role, selectedStaffUser, submitWithPin]);

  const handleQuickLogin = (targetUser: User) => {
    setSelectedStaffUser(targetUser);
    setRole(targetUser.role);
    const targetPin = targetUser.pin || (targetUser.role === 'admin' ? '1234' : '0000');
    setPin(targetPin);
    AppStore.setActiveStaff(targetUser);
    onLoginSuccess(targetUser);
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-stone-900 text-white p-6 sm:p-8 shadow-2xl border border-stone-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center pb-5 border-b border-stone-800">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20">
            <Coffee className="h-7 w-7" />
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-stone-50">
            Yellow Hauz POS
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Staff &amp; Admin Terminal Authentication
          </p>
        </div>

        {/* Role Switcher */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-stone-800/80 p-1.5 border border-stone-700/60">
          <button
            type="button"
            onClick={() => {
              setRole('cashier');
              setSelectedStaffUser(null);
              setPin('');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
              role === 'cashier'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Cashier Mode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setSelectedStaffUser(null);
              setPin('');
              setError('');
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
              role === 'admin'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Admin Mode</span>
          </button>
        </div>

        {/* PIN Display */}
        <div className="my-5 text-center">
          <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
            Enter 4-Digit Security PIN (or use keyboard)
          </label>
          <div className="flex justify-center items-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`grid h-12 w-12 place-items-center rounded-xl border font-mono text-xl font-bold transition-all ${
                  pin.length > idx
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-xs scale-105'
                    : 'border-stone-700 bg-stone-800/60 text-stone-600'
                }`}
              >
                {pin.length > idx ? '●' : ''}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-950/70 border border-rose-800 p-2.5 text-center text-xs font-medium text-rose-300">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 rounded-2xl bg-stone-800 text-xl font-bold text-stone-100 hover:bg-stone-700 active:scale-95 transition shadow-xs cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 rounded-2xl bg-stone-800/60 text-xs font-bold text-stone-400 hover:bg-stone-700 hover:text-white transition cursor-pointer"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-stone-800 text-xl font-bold text-stone-100 hover:bg-stone-700 active:scale-95 transition shadow-xs cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="grid h-13 place-items-center rounded-2xl bg-stone-800/60 text-stone-400 hover:bg-stone-700 hover:text-white transition cursor-pointer"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => submitWithPin(pin, role, selectedStaffUser)}
          disabled={pin.length < 4}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 disabled:opacity-40 hover:bg-amber-400 transition shadow-lg active:scale-98 cursor-pointer"
        >
          <span>Unlock Terminal</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Quick Access Account Selector */}
        <div className="mt-5 pt-4 border-t border-stone-800 text-center">
          <p className="text-[11px] text-stone-400 mb-2 font-medium flex items-center justify-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Select Staff Profile &amp; Instant Login:</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto no-scrollbar pr-0.5">
            {allUsers
              .filter((u) => u.status === 'active')
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u)}
                  className="flex items-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700/90 p-2 text-left text-xs font-bold text-stone-200 border border-stone-700 hover:border-amber-500/50 transition cursor-pointer"
                >
                  <div
                    className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] font-bold ${
                      u.role === 'admin'
                        ? 'bg-purple-900/60 text-purple-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {u.role === 'admin' ? (
                      <Shield className="h-3.5 w-3.5" />
                    ) : (
                      <UserCheck className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <div className="truncate text-stone-100 text-[11px] leading-tight">
                      {u.fullName}
                    </div>
                    <div className="text-[9px] text-stone-400 font-mono">
                      {u.employeeId} • PIN: {u.pin || (u.role === 'admin' ? '1234' : '0000')}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
