import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
  X,
  Lock,
  Percent,
} from 'lucide-react';

export type ModalType = 'info' | 'warning' | 'error' | 'success' | 'danger';

export interface AlertOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

export interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'password' | 'number';
  confirmText?: string;
  cancelText?: string;
  badge?: string;
  validate?: (val: string) => string | null; // return error message if invalid
}

interface ModalContextType {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

type ActiveModal =
  | {
      id: string;
      kind: 'alert';
      title: string;
      message: string;
      type: ModalType;
      confirmText: string;
      resolve: () => void;
    }
  | {
      id: string;
      kind: 'confirm';
      title: string;
      message: string;
      type: ModalType;
      confirmText: string;
      cancelText: string;
      resolve: (value: boolean) => void;
    }
  | {
      id: string;
      kind: 'prompt';
      title: string;
      message?: string;
      defaultValue: string;
      placeholder: string;
      inputType: 'text' | 'password' | 'number';
      confirmText: string;
      cancelText: string;
      badge?: string;
      validate?: (val: string) => string | null;
      resolve: (value: string | null) => void;
    };

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [promptError, setPromptError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showAlert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise<void>((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setModal({
        id: Math.random().toString(),
        kind: 'alert',
        title: opts.title || (opts.type === 'error' ? 'Notice' : opts.type === 'success' ? 'Success' : 'Information'),
        message: opts.message,
        type: opts.type || 'info',
        confirmText: opts.confirmText || 'OK',
        resolve,
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const opts = typeof options === 'string' ? { message: options } : options;
      setModal({
        id: Math.random().toString(),
        kind: 'confirm',
        title: opts.title || 'Please Confirm',
        message: opts.message,
        type: opts.type || 'warning',
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        resolve,
      });
    });
  }, []);

  const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      setPromptInput(options.defaultValue || '');
      setPromptError(null);
      setModal({
        id: Math.random().toString(),
        kind: 'prompt',
        title: options.title,
        message: options.message,
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
        inputType: options.inputType || 'text',
        confirmText: options.confirmText || 'Submit',
        cancelText: options.cancelText || 'Cancel',
        badge: options.badge,
        validate: options.validate,
        resolve,
      });

      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    });
  }, []);

  const handleCloseAlert = () => {
    if (modal && modal.kind === 'alert') {
      const res = modal.resolve;
      setModal(null);
      res();
    }
  };

  const handleConfirmAction = (confirmed: boolean) => {
    if (modal && modal.kind === 'confirm') {
      const res = modal.resolve;
      setModal(null);
      res(confirmed);
    }
  };

  const handlePromptSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (modal && modal.kind === 'prompt') {
      if (modal.validate) {
        const err = modal.validate(promptInput);
        if (err) {
          setPromptError(err);
          return;
        }
      }
      const res = modal.resolve;
      setModal(null);
      res(promptInput);
    }
  };

  const handlePromptCancel = () => {
    if (modal && modal.kind === 'prompt') {
      const res = modal.resolve;
      setModal(null);
      res(null);
    }
  };

  const renderIcon = (type: ModalType, kind: string) => {
    if (kind === 'prompt') {
      if (modal && 'badge' in modal && modal.badge === 'admin') {
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
            <Lock className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
      }
      if (modal && 'badge' in modal && modal.badge === 'discount') {
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 ring-8 ring-amber-500/5">
            <Percent className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
      }
      return (
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 text-stone-700 ring-8 ring-stone-100/50">
          <HelpCircle className="h-6 w-6 stroke-[2.2]" />
        </div>
      );
    }

    switch (type) {
      case 'success':
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
      case 'error':
      case 'danger':
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
            <AlertCircle className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
      case 'warning':
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
            <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 ring-8 ring-sky-50/50">
            <Info className="h-6 w-6 stroke-[2.2]" />
          </div>
        );
    }
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                if (modal.kind === 'alert') handleCloseAlert();
                else if (modal.kind === 'confirm') handleConfirmAction(false);
                else handlePromptCancel();
              }}
              className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl z-10"
              role="dialog"
              aria-modal="true"
            >
              {/* Close corner icon button */}
              <button
                type="button"
                onClick={() => {
                  if (modal.kind === 'alert') handleCloseAlert();
                  else if (modal.kind === 'confirm') handleConfirmAction(false);
                  else handlePromptCancel();
                }}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                {renderIcon(modal.type, modal.kind)}

                <h3 className="mt-4 text-xl font-bold font-display text-stone-900 tracking-tight">
                  {modal.title}
                </h3>

                {modal.message && (
                  <p className="mt-2 text-sm leading-relaxed text-stone-600 max-w-xs whitespace-pre-line">
                    {modal.message}
                  </p>
                )}

                {/* Prompt input field */}
                {modal.kind === 'prompt' && (
                  <form onSubmit={handlePromptSubmit} className="mt-5 w-full">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type={modal.inputType}
                        value={promptInput}
                        onChange={(e) => {
                          setPromptInput(e.target.value);
                          if (promptError) setPromptError(null);
                        }}
                        placeholder={modal.placeholder}
                        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-base font-semibold text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                        autoFocus
                      />
                    </div>
                    {promptError && (
                      <p className="mt-2 text-xs font-semibold text-rose-600">{promptError}</p>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={handlePromptCancel}
                        className="w-1/2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition-all"
                      >
                        {modal.cancelText}
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-extrabold text-stone-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-[0.98] transition-all"
                      >
                        {modal.confirmText}
                      </button>
                    </div>
                  </form>
                )}

                {/* Alert button */}
                {modal.kind === 'alert' && (
                  <div className="mt-6 w-full">
                    <button
                      type="button"
                      onClick={handleCloseAlert}
                      autoFocus
                      className={`w-full rounded-2xl py-3 text-sm font-extrabold shadow-md transition-all active:scale-[0.98] ${
                        modal.type === 'error' || modal.type === 'danger'
                          ? 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-500'
                          : 'bg-stone-900 text-white shadow-stone-900/10 hover:bg-stone-800'
                      }`}
                    >
                      {modal.confirmText}
                    </button>
                  </div>
                )}

                {/* Confirm buttons */}
                {modal.kind === 'confirm' && (
                  <div className="mt-6 flex w-full items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleConfirmAction(false)}
                      className="w-1/2 rounded-2xl border border-stone-200 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition-all"
                    >
                      {modal.cancelText}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmAction(true)}
                      autoFocus
                      className={`w-1/2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-md transition-all active:scale-[0.98] ${
                        modal.type === 'danger' || modal.type === 'error'
                          ? 'bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-500'
                          : 'bg-amber-500 text-stone-950 shadow-amber-500/20 hover:bg-amber-400'
                      }`}
                    >
                      {modal.confirmText}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
