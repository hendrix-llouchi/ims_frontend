import React, { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchOwnerUsers,
  createOwnerUser,
  fetchOwnerUserDetails,
  updateOwnerUser,
  deactivateOwnerUser,
  reactivateOwnerUser,
  resetOwnerUserPassword,
  deleteOwnerUser,
} from '../../api/owner/ownerApi';
import type { OwnerUser } from '../../types/ownerApi';

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-indigo-50 text-indigo-700',
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-sky-50 text-sky-700',
    'bg-rose-50 text-rose-700',
    'bg-violet-50 text-violet-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function UserManagementPage() {
  const { addNotification } = useNotificationStore();

  // Users listing state
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'manager' | 'worker' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Loading states for actions (row specific using user ID)
  const [updatingStatusIds, setUpdatingStatusIds] = useState<number[]>([]);
  const [resettingPasswordIds, setResettingPasswordIds] = useState<number[]>([]);

  // Modal: Create / Edit User
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingUser, setEditingUser] = useState<OwnerUser | null>(null);
  const [formFields, setFormFields] = useState({
    name: '',
    age: '',
    phone_number: '',
    location: '',
    emergency_contact: '',
    email: '',
    username: '',
    role: 'worker' as 'manager' | 'worker',
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Modal: View Details
  const [viewingUser, setViewingUser] = useState<OwnerUser | null>(null);

  // Modal: Credentials Card
  const [credentialsData, setCredentialsData] = useState<{
    name: string;
    username: string;
    temporary_password: string;
  } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Modal: Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<OwnerUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load users data
  const loadUsersData = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const activeParam: boolean | '' =
        statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : '';
      const response = await fetchOwnerUsers({
        page: targetPage,
        search: debouncedSearch.trim(),
        role: roleFilter,
        is_active: activeParam,
      });

      // Filter out any Owner roles just in case the backend returns them
      const nonOwners = response.data.filter((u) => u.role !== 'owner');

      setUsers(nonOwners);
      setPage(response.current_page);
      setTotalPages(response.last_page);
      setTotalUsers(response.total);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(
        axiosError.response?.data?.message ||
          'Failed to load user management data. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, statusFilter, page]);

  // Load data when filters change
  useEffect(() => {
    loadUsersData(1);
  }, [debouncedSearch, roleFilter, statusFilter]);

  // Open Form Modal (Create)
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormFields({
      name: '',
      age: '',
      phone_number: '',
      location: '',
      emergency_contact: '',
      email: '',
      username: '',
      role: 'worker',
    });
    setFormBannerError(null);
    setFieldErrors({});
    setShowFormModal(true);
  };

  // Open Form Modal (Edit)
  const handleOpenEditModal = async (user: OwnerUser) => {
    setEditingUser(user);
    setFormBannerError(null);
    setFieldErrors({});
    
    // Pre-fill form from user details (potentially missing full emergency_contact initially)
    setIsLoading(true);
    try {
      const details = await fetchOwnerUserDetails(user.id);
      setFormFields({
        name: details.user.name || '',
        age: details.user.age?.toString() || '',
        phone_number: details.user.phone_number || '',
        location: details.user.location || '',
        emergency_contact: details.user.emergency_contact || '',
        email: details.user.email || '',
        username: details.user.username || '',
        role: details.user.role === 'manager' ? 'manager' : 'worker',
      });
      setShowFormModal(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: axiosError.response?.data?.message || 'Failed to fetch user details for editing.',
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Create or Edit User
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormBannerError(null);
    setFieldErrors({});

    const {
      name,
      age,
      phone_number,
      location,
      emergency_contact,
      email,
      username,
      role,
    } = formFields;

    const trimmedName = name.trim();
    const trimmedAgeStr = age.trim();
    const trimmedPhone = phone_number.trim();
    const trimmedLocation = location.trim();
    const trimmedEmergency = emergency_contact.trim();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    // Clientside validations
    const errors: Record<string, string> = {};
    if (!trimmedName) errors.name = 'Name is required.';
    if (!trimmedAgeStr) {
      errors.age = 'Age is required.';
    } else {
      const parsedAge = parseInt(trimmedAgeStr, 10);
      if (isNaN(parsedAge) || parsedAge <= 0) {
        errors.age = 'Age must be a positive integer.';
      }
    }
    if (!trimmedPhone) errors.phone_number = 'Phone number is required.';
    if (!trimmedLocation) errors.location = 'Location is required.';
    if (!trimmedEmergency) errors.emergency_contact = 'Emergency contact is required.';
    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        errors.email = 'Please enter a valid email address.';
      }
    }
    if (!editingUser && !trimmedUsername) {
      errors.username = 'Username is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormBannerError('Please resolve the errors below.');
      return;
    }

    setIsSubmittingForm(true);

    try {
      if (editingUser) {
        // Edit User PUT /api/owner/users/{id}
        // Fields exclude role in update payload
        const updatePayload = {
          name: trimmedName,
          age: parseInt(trimmedAgeStr, 10),
          phone_number: trimmedPhone,
          location: trimmedLocation,
          emergency_contact: trimmedEmergency,
          email: trimmedEmail,
        };

        const res = await updateOwnerUser(editingUser.id, updatePayload);
        addNotification({
          id: Math.random().toString(36).substring(7),
          message: res.message || 'User profile updated successfully.',
          type: 'success',
          createdAt: new Date(),
        });
        setShowFormModal(false);
        loadUsersData(page);
      } else {
        // Create User POST /api/owner/users/create
        const createPayload = {
          name: trimmedName,
          age: parseInt(trimmedAgeStr, 10),
          phone_number: trimmedPhone,
          location: trimmedLocation,
          emergency_contact: trimmedEmergency,
          email: trimmedEmail,
          username: trimmedUsername,
          role,
        };

        const res = await createOwnerUser(createPayload);
        setShowFormModal(false);
        // Open credentials card with password
        setCredentialsData({
          name: res.user.name,
          username: res.user.username,
          temporary_password: res.temporary_password || 'IMS@1234',
        });
        loadUsersData(1);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const responseData = err?.response?.data;

      if (status === 422 && responseData?.errors) {
        const errors: Record<string, string> = {};
        Object.keys(responseData.errors).forEach((key) => {
          const messages = responseData.errors[key];
          errors[key] = Array.isArray(messages) ? messages[0] : messages;
        });
        setFieldErrors(errors);
        setFormBannerError(responseData.message || 'Validation failed. Please correct the fields.');
      } else {
        setFormBannerError(responseData?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = async (id: number) => {
    try {
      const details = await fetchOwnerUserDetails(id);
      setViewingUser(details.user);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: axiosError.response?.data?.message || 'Failed to fetch user profile details.',
        type: 'error',
        createdAt: new Date(),
      });
    }
  };

  // Toggle user activation / deactivation state
  const handleToggleStatus = async (user: OwnerUser) => {
    const userId = user.id;
    setUpdatingStatusIds((prev) => [...prev, userId]);

    try {
      if (user.is_active) {
        // Deactivate user
        await deactivateOwnerUser(userId);
        addNotification({
          id: Math.random().toString(36).substring(7),
          message: `${user.name} has been deactivated successfully.`,
          type: 'success',
          createdAt: new Date(),
        });
      } else {
        // Reactivate user
        await reactivateOwnerUser(userId);
        addNotification({
          id: Math.random().toString(36).substring(7),
          message: `${user.name} has been reactivated successfully. Clear failures and lockouts.`,
          type: 'success',
          createdAt: new Date(),
        });
      }
      loadUsersData(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: axiosError.response?.data?.message || 'Failed to toggle user status.',
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setUpdatingStatusIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Reset User Password
  const handleResetPassword = async (user: OwnerUser) => {
    const userId = user.id;
    setResettingPasswordIds((prev) => [...prev, userId]);

    try {
      const res = await resetOwnerUserPassword(userId);
      setCredentialsData({
        name: user.name,
        username: user.username,
        temporary_password: res.temporary_password,
      });
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: `Password reset successfully for ${user.name}.`,
        type: 'success',
        createdAt: new Date(),
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: axiosError.response?.data?.message || 'Failed to reset password.',
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setResettingPasswordIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Trigger permanent delete confirmation modal
  const handleTriggerDelete = (user: OwnerUser) => {
    setDeletingUser(user);
    setIsDeleting(false);
  };

  // Execute delete user
  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);

    try {
      await deleteOwnerUser(deletingUser.id);
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: `${deletingUser.name} has been permanently deleted.`,
        type: 'success',
        createdAt: new Date(),
      });
      setDeletingUser(null);
      loadUsersData(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: axiosError.response?.data?.message || 'Failed to delete user.',
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error('Failed to copy credentials', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage system administrators, managers, and warehouse personnel accounts.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer shrink-0"
        >
          <span>➕ Create User</span>
        </button>
      </div>

      {/* Filter / Search bar section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-3xs">
        {/* Search input */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-row gap-3 w-full md:w-auto items-center justify-end">
          {/* Role Filter */}
          <div className="w-1/2 md:w-40">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all bg-white"
            >
              <option value="">All Roles</option>
              <option value="manager">Manager</option>
              <option value="worker">Worker</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-1/2 md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      {isLoading && users.length === 0 ? (
        // Loading state
        <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="animate-pulse">
            <div className="bg-gray-50/50 border-b border-gray-100 h-12 w-full flex items-center px-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="border-b border-gray-100 h-16 w-full flex items-center px-6 gap-4"
              >
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        // Error state
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center">
          <span className="text-lg mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900">Failed to Load Users</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadUsersData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : users.length === 0 ? (
        // Empty state
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white shadow-3xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            👥
          </span>
          <h3 className="text-base font-bold text-gray-900">No users found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Try adjusting your search criteria or register a new user in the system.
          </p>
        </div>
      ) : (
        // Table populated state
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Username
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Email Address
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Role
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => {
                    const initials = getInitials(user.name);
                    const colorClass = getAvatarColor(user.name);

                    return (
                      <tr key={user.id} className="hover:bg-gray-50/40 transition-colors">
                        {/* Name / Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-xs ${colorClass}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-gray-900">{user.name}</div>
                              {user.location && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  📍 {user.location}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Username */}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">
                          @{user.username}
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>

                        {/* Role badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                              user.role === 'manager'
                                ? 'bg-purple-50 text-purple-700 ring-purple-600/20'
                                : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                            }`}
                          >
                            {user.role === 'manager' ? '💼 Manager' : '🛠️ Worker'}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ring-1 ring-inset ${
                              user.is_active
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>

                        {/* Actions column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* View Detail Button */}
                            <button
                              onClick={() => handleOpenDetails(user.id)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer"
                              title="View Details"
                            >
                              👁️
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer"
                              title="Edit User"
                            >
                              ✏️
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleResetPassword(user)}
                              disabled={resettingPasswordIds.includes(user.id)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/30 transition-all cursor-pointer disabled:opacity-50"
                              title="Reset Password"
                            >
                              {resettingPasswordIds.includes(user.id) ? '🔑...' : '🔑'}
                            </button>

                            {/* Activate / Deactivate Toggle Button */}
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={updatingStatusIds.includes(user.id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 ${
                                user.is_active
                                  ? 'border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300'
                                  : 'border-green-200 bg-white text-green-700 hover:bg-green-50 hover:border-green-300'
                              }`}
                            >
                              {updatingStatusIds.includes(user.id) ? (
                                '🔄...'
                              ) : user.is_active ? (
                                <>📴 Deactivate</>
                              ) : (
                                <>🔋 Reactivate</>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleTriggerDelete(user)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-100 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                              title="Delete User"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-4 px-1">
            <span className="text-xs font-semibold text-gray-500">
              Showing {users.length} of {totalUsers} users
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadUsersData(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadUsersData(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Create / Edit User Form ────────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
                disabled={isSubmittingForm}
              >
                ✕
              </button>
            </div>

            {formBannerError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl shrink-0">
                ⚠️ {formBannerError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formFields.name}
                    onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                    placeholder="John Doe"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.name
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.name && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.name}</span>
                  )}
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Age *
                  </label>
                  <input
                    type="number"
                    value={formFields.age}
                    onChange={(e) => setFormFields({ ...formFields, age: e.target.value })}
                    placeholder="25"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.age
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.age && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.age}</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formFields.email}
                    onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                    placeholder="johndoe@example.com"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.email
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.email && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.email}</span>
                  )}
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formFields.username}
                    onChange={(e) => setFormFields({ ...formFields, username: e.target.value })}
                    placeholder="johndoe"
                    disabled={isSubmittingForm || !!editingUser}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      editingUser
                        ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                        : fieldErrors.username
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {editingUser && (
                    <span className="text-[10px] text-gray-400 font-medium block">
                      Username cannot be changed after creation.
                    </span>
                  )}
                  {fieldErrors.username && !editingUser && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.username}</span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formFields.phone_number}
                    onChange={(e) => setFormFields({ ...formFields, phone_number: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.phone_number
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.phone_number && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.phone_number}</span>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formFields.location}
                    onChange={(e) => setFormFields({ ...formFields, location: e.target.value })}
                    placeholder="New York, USA"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.location
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.location && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.location}</span>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Emergency Contact *
                  </label>
                  <input
                    type="text"
                    value={formFields.emergency_contact}
                    onChange={(e) => setFormFields({ ...formFields, emergency_contact: e.target.value })}
                    placeholder="Jane Doe: +1 (555) 111-1111"
                    disabled={isSubmittingForm}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:outline-none transition-all ${
                      fieldErrors.emergency_contact
                        ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  />
                  {fieldErrors.emergency_contact && (
                    <span className="text-[10px] text-red-500 font-medium block">{fieldErrors.emergency_contact}</span>
                  )}
                </div>

                {/* User Role Selection */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                    User Role *
                  </label>
                  <select
                    value={formFields.role}
                    onChange={(e) => setFormFields({ ...formFields, role: e.target.value as any })}
                    disabled={isSubmittingForm || !!editingUser}
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white focus:outline-none transition-all ${
                      editingUser
                        ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    }`}
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                  </select>
                  {editingUser && (
                    <span className="text-[10px] text-gray-400 font-medium block">
                      Role cannot be changed after creation.
                    </span>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={isSubmittingForm}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? 'Submitting...' : editingUser ? 'Save Profile' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: View User Details ────────────────────────────────────────── */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">User Profile Details</h3>
              <button
                onClick={() => setViewingUser(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Initials & Basic Info */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold text-sm ${getAvatarColor(
                    viewingUser.name
                  )}`}
                >
                  {getInitials(viewingUser.name)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{viewingUser.name}</h4>
                  <span className="text-xs text-gray-500 font-medium">@{viewingUser.username}</span>
                </div>
              </div>

              {/* Grid of Profile Details */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Role
                  </span>
                  <span className="font-semibold text-gray-800 capitalize mt-1 block">
                    {viewingUser.role}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">
                    {viewingUser.is_active ? '✅ Active' : '❌ Deactivated'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Age
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">
                    {viewingUser.age || 'N/A'} years old
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Location
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">
                    {viewingUser.location || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Email Address
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">{viewingUser.email}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Phone Number
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">
                    {viewingUser.phone_number || 'N/A'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Emergency Contact
                  </span>
                  <span className="font-semibold text-gray-800 mt-1 block">
                    {viewingUser.emergency_contact || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-gray-100">
              <button
                onClick={() => setViewingUser(null)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Credentials Card (Create Success / Reset Password) ─────────── */}
      {credentialsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="text-center py-2">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-2xl border border-emerald-100 shadow-2xs mb-3">
                ✓
              </span>
              <h3 className="text-lg font-bold text-gray-900">
                Credentials Generated
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Security credentials for user <span className="font-semibold text-gray-700">{credentialsData.name}</span>.
              </p>
            </div>

            <div className="space-y-4 my-5">
              {/* Credentials Mono box */}
              <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-xl p-4 font-mono text-sm space-y-3 relative overflow-hidden shadow-inner">
                <div>
                  <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 select-none">
                    Username
                  </span>
                  <span className="text-indigo-300 font-bold select-all">
                    {credentialsData.username}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-800 pt-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 select-none">
                      Temporary Password
                    </span>
                    <span className="text-emerald-400 font-bold select-all truncate block">
                      {credentialsData.temporary_password}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyToClipboard(credentialsData.temporary_password)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-2xs shrink-0 select-none"
                  >
                    {copiedText ? 'Copied! ✓' : '📋 Copy'}
                  </button>
                </div>
              </div>

              {/* Bold Warning Alert */}
              <div className="p-3.5 bg-yellow-50/70 border border-yellow-200 rounded-xl">
                <p className="text-xs font-bold text-yellow-800 leading-normal">
                  ⚠️ This password will not be shown again. Make sure to share it with the user securely now.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 shrink-0">
              <button
                onClick={() => {
                  setCredentialsData(null);
                  setCopiedText(false);
                }}
                className="w-full sm:w-auto rounded-xl bg-gray-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-gray-850 transition-all cursor-pointer shadow-xs text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Delete Confirmation ────────────────────────────────────────── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Delete User Account
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Are you sure you want to permanently delete user <span className="font-semibold text-gray-800">{deletingUser.name}</span>? This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="rounded-xl bg-red-650 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
