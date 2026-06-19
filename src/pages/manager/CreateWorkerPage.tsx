import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorkerAccount, fetchSharedWarehouses } from '../../api/manager/managerApi';
import type { ManagerWorker, WorkerProductWarehouse } from '../../types/workerApi';

export default function CreateWorkerPage() {
  const navigate = useNavigate();

  // Form Fields State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Warehouse list for dropdown
  const [warehouses, setWarehouses] = useState<WorkerProductWarehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);

  // Status and Error States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch warehouses on mount
  useEffect(() => {
    let isMounted = true;
    const loadWarehouses = async () => {
      try {
        setIsLoadingWarehouses(true);
        const res = await fetchSharedWarehouses(1);
        if (isMounted) {
          setWarehouses(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load warehouses:', err);
        if (isMounted) {
          setBannerError('Failed to load warehouses. Please refresh the page.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingWarehouses(false);
        }
      }
    };

    loadWarehouses();
    return () => {
      isMounted = false;
    };
  }, []);

  // Success State
  const [createdWorker, setCreatedWorker] = useState<ManagerWorker | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  // Form Reset
  const handleReset = () => {
    setName('');
    setAge('');
    setPhoneNumber('');
    setLocation('');
    setEmail('');
    setEmergencyContact('');
    setBannerError(null);
    setFieldErrors({});
    setCreatedWorker(null);
    setTemporaryPassword(null);
    setCopiedField(null);
  };

  // Clipboard Copy Function
  const handleCopy = async (text: string, field: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setFieldErrors({});

    const trimmedName = name.trim();
    const trimmedAgeStr = age.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedLocation = location.trim();
    const trimmedEmail = email.trim();
    const trimmedEmergency = emergencyContact.trim();

    // 1. Basic Required Validation
    if (
      !trimmedName ||
      !trimmedAgeStr ||
      !trimmedPhone ||
      !trimmedLocation ||
      !trimmedEmail ||
      !trimmedEmergency
    ) {
      setBannerError('Please fill in all required fields.');
      return;
    }

    // 2. Age Validation
    const parsedAge = parseInt(trimmedAgeStr, 10);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      setFieldErrors((prev) => ({
        ...prev,
        age: 'Age must be a positive number.',
      }));
      return;
    }

    // 3. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address.',
      }));
      return;
    }

    setIsSubmitting(true);

    // Auto-generate username from email prefix
    const generatedUsername = trimmedEmail
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');

    try {
      const response = await createWorkerAccount({
        name: trimmedName,
        age: parsedAge,
        phone_number: trimmedPhone,
        location: trimmedLocation,
        emergency_contact: trimmedEmergency,
        email: trimmedEmail,
        username: generatedUsername,
        role: 'worker',
      });

      setCreatedWorker(response.user);
      if (response.temporary_password) {
        setTemporaryPassword(response.temporary_password);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const responseData = err?.response?.data;

      if (status === 422 && responseData?.errors) {
        const errors: Record<string, string> = {};
        Object.keys(responseData.errors).forEach((key) => {
          // Map to correct frontend fields
          let fieldName = key;
          if (key === 'phone_number') fieldName = 'phone_number';
          else if (key === 'emergency_contact') fieldName = 'emergency_contact';
          
          const messages = responseData.errors[key];
          errors[fieldName] = Array.isArray(messages) ? messages[0] : messages;
        });

        // If duplicate username occurred, map it or show a general error
        if (responseData.errors.username) {
          errors.email = responseData.errors.username[0] || 'Username already exists.';
        }

        setFieldErrors(errors);
      } else if (status === 500) {
        setBannerError('Something went wrong. Please try again.');
      } else {
        // Network or unknown errors
        setBannerError('Check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdWorker) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Success Card Header */}
        <div className="text-center py-6">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-3xl mb-4 border border-emerald-100 shadow-xs">
            ✓
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            Worker account created successfully
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            The worker profile for <span className="font-semibold text-gray-800">{createdWorker.name}</span> is registered in the database.
          </p>
        </div>

        {/* Credentials Box */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 tracking-wide uppercase border-b border-gray-100 pb-3">
            Temporary Credentials
          </h2>

          <div className="space-y-4">
            {/* Username Field */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Username
                </span>
                <span className="text-sm font-mono font-bold text-gray-800">
                  {createdWorker.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(createdWorker.username, 'username')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                {copiedField === 'username' ? 'Copied! ✓' : '📋 Copy'}
              </button>
            </div>

            {/* Password Field */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Temporary Password
                </span>
                <span className="text-sm font-mono font-bold text-gray-800">
                  {temporaryPassword || 'IMS@1234'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(temporaryPassword || 'IMS@1234', 'password')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                {copiedField === 'password' ? 'Copied! ✓' : '📋 Copy'}
              </button>
            </div>
          </div>

          {/* Share Warning Alert */}
          <div className="rounded-xl bg-amber-50 border border-amber-200/50 p-4 flex gap-3 text-amber-800 text-xs">
            <span className="text-sm shrink-0">⚠️</span>
            <p className="leading-relaxed">
              <span className="font-bold">Note:</span> Share these credentials with the worker. They will be asked to set a new password on first login.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
          >
            Create Another
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager/workers')}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Worker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Register a new warehouse worker account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/manager/workers')}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
        >
          Cancel
        </button>
      </div>

      {/* Main Form Box */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {bannerError && (
          <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-sm flex gap-2">
            <span aria-hidden="true">⚠️</span>
            <span>{bannerError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Full Name Input */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                fieldErrors.name ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <span aria-hidden="true">❌</span> {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Age & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age Input */}
            <div className="space-y-1">
              <label htmlFor="age" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Age *
              </label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 28"
                min="1"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                  fieldErrors.age ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {fieldErrors.age && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <span aria-hidden="true">❌</span> {fieldErrors.age}
                </p>
              )}
            </div>

            {/* Location Input */}
            <div className="space-y-1">
              <label htmlFor="location" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Location / Warehouse *
              </label>
              {isLoadingWarehouses ? (
                <div className="h-10 w-full bg-gray-100 animate-pulse rounded-xl" />
              ) : warehouses.length === 0 ? (
                <div>
                  <select
                    id="location"
                    disabled
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 focus:outline-hidden cursor-not-allowed"
                  >
                    <option value="">No warehouses found. Create one first.</option>
                  </select>
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    ⚠️ Please create a warehouse before registering workers.
                  </p>
                </div>
              ) : (
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                    fieldErrors.location ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Select a warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.name}>
                      {wh.name} ({wh.location})
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.location && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                  <span aria-hidden="true">❌</span> {fieldErrors.location}
                </p>
              )}
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Email Address *
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. worker@example.com"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                fieldErrors.email ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <span aria-hidden="true">❌</span> {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1">
            <label htmlFor="phone_number" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Phone Number *
            </label>
            <input
              type="text"
              id="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1 555-0199"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                fieldErrors.phone_number ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {fieldErrors.phone_number && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <span aria-hidden="true">❌</span> {fieldErrors.phone_number}
              </p>
            )}
          </div>

          {/* Emergency Contact Input */}
          <div className="space-y-1">
            <label htmlFor="emergency_contact" className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
              Emergency Contact *
            </label>
            <input
              type="text"
              id="emergency_contact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g. Jane Doe (Spouse) - +1 555-0188"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-hidden transition-all ${
                fieldErrors.emergency_contact ? 'border-red-500 bg-red-50/10' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
            />
            {fieldErrors.emergency_contact && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                <span aria-hidden="true">❌</span> {fieldErrors.emergency_contact}
              </p>
            )}
          </div>

          {/* Submit Button Container */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (!isLoadingWarehouses && warehouses.length === 0)}
              className="w-full flex items-center justify-center rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Creating worker...' : 'Create Worker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
