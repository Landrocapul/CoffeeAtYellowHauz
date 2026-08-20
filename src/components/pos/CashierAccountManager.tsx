import React, { useState, useMemo } from 'react';
import { User, Order } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Sparkles,
  Phone,
  Mail,
  Receipt,
  Calendar,
  Lock,
  RefreshCw,
  Award,
} from 'lucide-react';

interface CashierAccountManagerProps {
  currentStaff: User | null;
  onRefreshStaff?: () => void;
}

export const CashierAccountManager: React.FC<CashierAccountManagerProps> = ({
  currentStaff,
  onRefreshStaff,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState<User[]>(() => AppStore.getUsers());
  const [orders] = useState<Order[]>(() => AppStore.getOrders());

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'cashier' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Reveal PIN states
  const [revealedPins, setRevealedPins] = useState<Record<number, boolean>>({});

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetUser, setPinTargetUser] = useState<User | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    employeeId: '',
    role: 'cashier' as 'cashier' | 'admin',
    status: 'active' as 'active' | 'inactive',
    pin: '0000',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refreshUserList = () => {
    const list = AppStore.getUsers();
    setUsers(list);
    if (onRefreshStaff) onRefreshStaff();
  };

  // Performance metrics per staff
  const staffMetrics = useMemo(() => {
    const metrics: Record<
      string,
      { orderCount: number; totalRevenue: number; lastSaleDate: string | null }
    > = {};

    for (const o of orders) {
      if (o.status !== 'completed') continue;
      const key = (o.cashierName || '').toLowerCase().trim();
      if (!key) continue;

      if (!metrics[key]) {
        metrics[key] = { orderCount: 0, totalRevenue: 0, lastSaleDate: null };
      }
      metrics[key].orderCount += 1;
      metrics[key].totalRevenue += o.totalAmount;
      if (!metrics[key].lastSaleDate || new Date(o.createdAt) > new Date(metrics[key].lastSaleDate!)) {
        metrics[key].lastSaleDate = o.createdAt;
      }
    }
    return metrics;
  }, [orders]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm)) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const activeCashiers = users.filter((u) => u.role === 'cashier' && u.status === 'active').length;
    const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
    const inactive = users.filter((u) => u.status === 'inactive').length;
    return { total, activeCashiers, activeAdmins, inactive };
  }, [users]);

  // Toggle reveal PIN
  const togglePinReveal = (id: number) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    const existingCashiers = users.filter((u) => u.role === 'cashier');
    const nextNum = existingCashiers.length + 1;
    const autoEmpId = `CASHIER00${nextNum > 9 ? nextNum : `0${nextNum}`}`;

    setFormData({
      fullName: '',
      username: '',
      employeeId: autoEmpId,
      role: 'cashier',
      status: 'active',
      pin: '0000',
      phone: '',
      email: '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      status: user.status,
      pin: user.pin || (user.role === 'admin' ? '1234' : '0000'),
      phone: user.phone || '',
      email: user.email || '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full Name is required';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.employeeId.trim()) {
      errors.employeeId = 'Employee ID is required';
    }
    if (!formData.pin || !/^\d{4}$/.test(formData.pin)) {
      errors.pin = 'PIN must be exactly 4 numeric digits';
    }

    // Check unique username
    const usernameTaken = users.some(
      (u) =>
        u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
        (!editingUser || u.id !== editingUser.id)
    );
    if (usernameTaken) {
      errors.username = 'Username is already taken by another staff member';
    }

    // Check unique employeeId
    const empIdTaken = users.some(
      (u) =>
        u.employeeId.toLowerCase() === formData.employeeId.trim().toLowerCase() &&
        (!editingUser || u.id !== editingUser.id)
    );
    if (empIdTaken) {
      errors.employeeId = 'Employee ID is already assigned to another staff member';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingUser) {
      AppStore.updateUser(editingUser.id, {
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        role: formData.role,
        status: formData.status,
        pin: formData.pin,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      showAlert({
        title: 'Account Updated',
        message: `Staff profile for ${formData.fullName} has been updated successfully.`,
        type: 'success',
      });
    } else {
      AppStore.createUser({
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        role: formData.role,
        status: formData.status,
        pin: formData.pin,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      showAlert({
        title: 'Cashier Account Created',
        message: `New account for ${formData.fullName} (${formData.role.toUpperCase()}) is active with PIN ${formData.pin}.`,
        type: 'success',
      });
    }

    refreshUserList();
    setIsFormModalOpen(false);
  };

  // Quick Toggle Status
  const handleToggleStatus = (user: User) => {
    if (user.role === 'admin' && user.status === 'active') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        showAlert({
          title: 'Action Blocked',
          message: 'Cannot deactivate the sole active Admin account.',
          type: 'error',
        });
        return;
      }
    }

    const updated = AppStore.toggleUserStatus(user.id);
    if (updated) {
      refreshUserList();
    }
  };

  // Open Reset PIN Modal
  const handleOpenPinModal = (user: User) => {
    setPinTargetUser(user);
    setNewPinValue('');
    setPinError('');
    setIsPinModalOpen(true);
  };

  // Save New PIN
  const handleSavePin = () => {
    if (!pinTargetUser) return;
    if (!/^\d{4}$/.test(newPinValue)) {
      setPinError('PIN must be exactly 4 digits (0-9).');
      return;
    }

    AppStore.resetUserPin(pinTargetUser.id, newPinValue);
    showAlert({
      title: 'PIN Changed',
      message: `Security PIN for ${pinTargetUser.fullName} has been reset to ${newPinValue}.`,
      type: 'success',
    });
    refreshUserList();
    setIsPinModalOpen(false);
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (currentStaff && currentStaff.id === user.id) {
      showAlert({
        title: 'Action Prohibited',
        message: 'You cannot delete your own currently active Admin account.',
        type: 'error',
      });
      return;
    }

    if (user.role === 'admin') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        showAlert({
          title: 'Action Prohibited',
          message: 'Cannot delete the only remaining Admin account.',
          type: 'error',
        });
        return;
      }
    }

    const confirmed = await showConfirm({
      title: `Delete ${user.fullName}?`,
      message: `Are you sure you want to permanently delete the account for ${user.fullName} (${user.employeeId})? Historical sales records and audit logs will remain intact.`,
      type: 'danger',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      const ok = AppStore.deleteUser(user.id);
      if (ok) {
        showAlert({
          title: 'Account Deleted',
          message: `The account for ${user.fullName} has been removed.`,
          type: 'success',
        });
        refreshUserList();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Total Staff
            </span>
            <Users className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            {stats.total}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Registered Accounts</span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Active Cashiers
            </span>
            <UserCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-amber-900 font-mono">
            {stats.activeCashiers}
          </div>
          <span className="text-[10px] text-stone-500 font-medium">Authorized for POS terminal</span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Admin Users
            </span>
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-purple-900 font-mono">
            {stats.activeAdmins}
          </div>
          <span className="text-[10px] text-stone-500 font-medium">Full system permissions</span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Inactive / In Leave
            </span>
            <UserX className="h-4 w-4 text-stone-400" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-600 font-mono">
            {stats.inactive}
          </div>
          <span className="text-[10px] text-stone-400 font-medium">Terminal access suspended</span>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-stone-100 p-2.5 border border-stone-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            placeholder="Search cashier by name, @username, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200">
            {(['all', 'cashier', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                  roleFilter === r
                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {r === 'all' ? 'All Roles' : r === 'cashier' ? 'Cashiers' : 'Admins'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                  statusFilter === s
                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Create Button */}
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-2 text-xs font-extrabold shadow-xs transition active:scale-98 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>+ Add Cashier</span>
          </button>
        </div>
      </div>

      {/* Cashier List Table / Cards */}
      <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Cashier / Staff Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Security PIN</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Orders / Sales</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-600">No staff members found</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Try adjusting your search query or role/status filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentStaff?.id === user.id;
                  const isRevealed = revealedPins[user.id] || false;
                  const pinToDisplay = user.pin || (user.role === 'admin' ? '1234' : '0000');
                  const metrics = staffMetrics[user.fullName.toLowerCase().trim()] || {
                    orderCount: 0,
                    totalRevenue: 0,
                  };

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-stone-50/70 transition ${
                        isCurrent ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`grid h-10 w-10 place-items-center rounded-2xl font-bold text-xs shadow-2xs ${
                              user.role === 'admin'
                                ? 'bg-stone-900 text-amber-400'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.2 text-[9px] font-extrabold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                              <span>@{user.username}</span>
                              <span>•</span>
                              <span className="text-stone-400">{user.employeeId}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-extrabold text-purple-800">
                            <Shield className="h-3 w-3 text-purple-600" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                            <UserCheck className="h-3 w-3 text-amber-600" /> Cashier
                          </span>
                        )}
                      </td>

                      {/* Security PIN */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 bg-stone-100/80 px-2.5 py-1 rounded-xl border border-stone-200 font-mono">
                          <KeyRound className="h-3.5 w-3.5 text-stone-400" />
                          <span className="font-bold text-xs tracking-wider text-stone-800">
                            {isRevealed ? pinToDisplay : '••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePinReveal(user.id)}
                            className="text-stone-400 hover:text-stone-700 transition cursor-pointer p-0.5"
                            title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-4 text-stone-600">
                        <div className="space-y-0.5 text-[11px]">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-stone-700">
                              <Phone className="h-3 w-3 text-stone-400" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">No phone</span>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-stone-500">
                              <Mail className="h-3 w-3 text-stone-400" />
                              <span className="truncate max-w-[150px]">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase transition cursor-pointer ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="Click to toggle account status"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {user.status}
                        </button>
                      </td>

                      {/* Performance */}
                      <td className="px-5 py-4 text-right font-mono">
                        <div className="font-bold text-stone-900">
                          ₱{metrics.totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {metrics.orderCount} order{metrics.orderCount !== 1 ? 's' : ''} settled
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-200">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="rounded-lg p-1.5 text-stone-600 hover:bg-white hover:text-stone-900 transition shadow-2xs"
                            title="Edit Account Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Reset PIN */}
                          <button
                            type="button"
                            onClick={() => handleOpenPinModal(user)}
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-white hover:text-amber-900 transition shadow-2xs"
                            title="Reset 4-Digit Security PIN"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrent || (user.role === 'admin' && stats.activeAdmins <= 1)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-white hover:text-rose-800 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs"
                            title={
                              isCurrent
                                ? 'Cannot delete current user'
                                : 'Delete Cashier Account'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Cashier Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-bold">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    {editingUser ? 'Edit Staff Account' : 'Register New Cashier / Staff'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingUser
                      ? `Update profile and permissions for ${editingUser.fullName}`
                      : 'Create a new POS cashier or administrator profile.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheila Mae Aledro"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sheila"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.username && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.username}</p>
                  )}
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CASHIER001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.employeeId && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.employeeId}</p>
                  )}
                </div>

                {/* 4-Digit PIN */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    4-Digit Security PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="0000"
                      value={formData.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setFormData({ ...formData, pin: val });
                      }}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono font-bold tracking-widest focus:border-amber-500 focus:outline-none"
                    />
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  </div>
                  {formErrors.pin && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.pin}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as 'cashier' | 'admin' })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="cashier">Cashier (POS &amp; Orders)</option>
                    <option value="admin">Admin (Full System Access)</option>
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +63 928 987 6543"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. sheila@yellowhauz.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Status */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Account Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition border ${
                        formData.status === 'active'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span>Active (Can log in)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'inactive' })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition border ${
                        formData.status === 'inactive'
                          ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <UserX className="h-4 w-4 text-rose-600" />
                      <span>Inactive / Suspended</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-5 py-2 text-xs font-extrabold shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{editingUser ? 'Save Changes' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && pinTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-900 mb-3">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>

            <h3 className="font-display text-base font-bold text-stone-900">
              Reset Security PIN
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Set a new 4-digit PIN for{' '}
              <span className="font-bold text-stone-800">{pinTargetUser.fullName}</span>.
            </p>

            <div className="my-5">
              <input
                type="text"
                autoFocus
                maxLength={4}
                placeholder="••••"
                value={newPinValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setNewPinValue(val);
                  setPinError('');
                }}
                className="w-40 text-center mx-auto rounded-2xl border border-amber-300 bg-amber-50/50 py-3 text-2xl font-mono font-extrabold tracking-widest text-stone-900 focus:border-amber-500 focus:outline-none ring-2 ring-amber-400/20"
              />
              {pinError && <p className="text-xs font-bold text-rose-600 mt-2">{pinError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePin}
                disabled={newPinValue.length !== 4}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-extrabold text-stone-950 shadow-xs disabled:opacity-40"
              >
                <span>Save PIN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
