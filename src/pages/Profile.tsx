import { useState } from 'react';
import { User, Shield, Key, Mail } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { apiRequest } from '@/lib/apiClient';
import { toast } from 'sonner';
import { z } from 'zod';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// Zod schemas for validation
const profileDetailsSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
});

const changePasswordSchema = z.object({
  old_password: z.string().nonempty('Old password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  new_password_confirm: z.string().min(8, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: "New passwords do not match",
  path: ["new_password_confirm"],
});

export default function Profile() {
  const { user, refreshAllData } = useData();

  // Profile Details Form State
  const [detailsForm, setDetailsForm] = useState({
    first_name: user?.name ? user.name.split(' ')[0] : '',
    last_name: user?.name ? user.name.split(' ').slice(1).join(' ') : '',
  });
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({});
  const [updatingDetails, setUpdatingDetails] = useState(false);

  // Change Password Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailsErrors({});

    const validation = profileDetailsSchema.safeParse(detailsForm);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setDetailsErrors(errors);
      return;
    }

    setUpdatingDetails(true);
    try {
      const res = await apiRequest('/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify(detailsForm),
      });

      if (res && res.success) {
        toast.success('Profile details updated successfully');
        // Refresh profile context
        await refreshAllData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile details.');
      if (err.details) {
        const backendErrors: Record<string, string> = {};
        Object.entries(err.details).forEach(([key, messages]) => {
          if (Array.isArray(messages) && messages[0]) {
            backendErrors[key] = messages[0];
          }
        });
        setDetailsErrors(backendErrors);
      }
    } finally {
      setUpdatingDetails(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const validation = changePasswordSchema.safeParse(passwordForm);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setPasswordErrors(errors);
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await apiRequest('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
          new_password_confirm: passwordForm.new_password_confirm,
        }),
      });

      if (res && res.success) {
        toast.success('Password changed successfully');
        setPasswordForm({
          old_password: '',
          new_password: '',
          new_password_confirm: '',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.');
      if (err.details) {
        const backendErrors: Record<string, string> = {};
        Object.entries(err.details).forEach(([key, messages]) => {
          if (Array.isArray(messages) && messages[0]) {
            backendErrors[key] = messages[0];
          }
        });
        setPasswordErrors(backendErrors);
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f6fb] font-sans p-6">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: User Profile Details Overview Card */}
        <div className="bg-[#0b0c0f] border border-white/5 rounded-2xl p-6 h-fit space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00d4c3] to-[#00a896] flex items-center justify-center text-3xl font-bold text-[#050505] shadow-lg shadow-[#00d4c3]/15 mb-4">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-xl font-bold text-white">{user?.name}</h2>
            <p className="text-xs text-[#00d4c3] uppercase tracking-wider font-semibold mt-1">{user?.role}</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-[#6b7280]">
              <Mail size={12} />
              <span>{user?.username}</span>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#52525b] uppercase tracking-wider">
              <Shield size={14} className="text-[#00d4c3]" />
              <span>Assigned Permissions</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {user?.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span 
                    key={perm}
                    className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/5 text-[#a6acb8] font-mono capitalize"
                  >
                    {perm.replace('_', ' ')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#52525b]">No explicit permissions assigned.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Update Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Form Card */}
          <div className="bg-[#0b0c0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00d4c3]" />
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <User size={18} className="text-[#00d4c3]" />
              Update Profile Details
            </h3>

            <form onSubmit={handleUpdateDetails} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">First Name</label>
                  <input 
                    type="text"
                    value={detailsForm.first_name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, first_name: e.target.value })}
                    className={cn(
                      "w-full bg-[#111318] border rounded-lg p-3 text-xs focus:outline-none text-white transition-all",
                      detailsErrors.first_name ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00d4c3]/50"
                    )}
                    placeholder="Enter first name"
                  />
                  {detailsErrors.first_name && <span className="text-[10px] text-red-500 block">{detailsErrors.first_name}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Last Name</label>
                  <input 
                    type="text"
                    value={detailsForm.last_name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, last_name: e.target.value })}
                    className={cn(
                      "w-full bg-[#111318] border rounded-lg p-3 text-xs focus:outline-none text-white transition-all",
                      detailsErrors.last_name ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00d4c3]/50"
                    )}
                    placeholder="Enter last name"
                  />
                  {detailsErrors.last_name && <span className="text-[10px] text-red-500 block">{detailsErrors.last_name}</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Email Address</label>
                <input 
                  type="email"
                  value={user?.username || ''}
                  disabled
                  className="w-full bg-[#0a0a0c] border border-white/5 rounded-lg p-3 text-xs text-[#52525b] cursor-not-allowed"
                />
                <span className="text-[10px] text-[#52525b]">Email address cannot be changed. Please contact your administrator.</span>
              </div>

              <button 
                type="submit"
                disabled={updatingDetails}
                className="px-5 py-2.5 bg-[#00d4c3] text-black font-bold rounded-lg text-xs hover:bg-[#00d4c3]/85 transition-colors disabled:opacity-50"
              >
                {updatingDetails ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Change Password Form Card */}
          <div className="bg-[#0b0c0f] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Key size={18} className="text-[#ff9500]" />
              Change Credentials Password
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Current Password</label>
                <input 
                  type="password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className={cn(
                    "w-full bg-[#111318] border rounded-lg p-3 text-xs focus:outline-none text-white transition-all",
                    passwordErrors.old_password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#ff9500]/50"
                  )}
                  placeholder="Enter old password"
                />
                {passwordErrors.old_password && <span className="text-[10px] text-red-500 block">{passwordErrors.old_password}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">New Password</label>
                  <input 
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className={cn(
                      "w-full bg-[#111318] border rounded-lg p-3 text-xs focus:outline-none text-white transition-all",
                      passwordErrors.new_password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#ff9500]/50"
                    )}
                    placeholder="Min 8 characters"
                  />
                  {passwordErrors.new_password && <span className="text-[10px] text-red-500 block">{passwordErrors.new_password}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[#52525b] uppercase tracking-wider">Confirm New Password</label>
                  <input 
                    type="password"
                    value={passwordForm.new_password_confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password_confirm: e.target.value })}
                    className={cn(
                      "w-full bg-[#111318] border rounded-lg p-3 text-xs focus:outline-none text-white transition-all",
                      passwordErrors.new_password_confirm ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#ff9500]/50"
                    )}
                    placeholder="Repeat new password"
                  />
                  {passwordErrors.new_password_confirm && <span className="text-[10px] text-red-500 block">{passwordErrors.new_password_confirm}</span>}
                </div>
              </div>

              <button 
                type="submit"
                disabled={updatingPassword}
                className="px-5 py-2.5 bg-[#ff9500] text-black font-bold rounded-lg text-xs hover:bg-[#ff9500]/85 transition-colors disabled:opacity-50"
              >
                {updatingPassword ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
