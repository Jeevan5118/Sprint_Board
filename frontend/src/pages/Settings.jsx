import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Bell, Users, FileText, Download, Calendar, Search, ArrowUpRight, Clock, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp, CheckCircle2, X } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import FilePreviewModal from '../components/common/FilePreviewModal';
import { getAbsoluteFileUrl } from '../utils/fileUtils';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');

    // Profile State
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Admin Creation State
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [newUserRole, setNewUserRole] = useState('Member');
    const [newUserTeamId, setNewUserTeamId] = useState('');
    const [teams, setTeams] = useState([]);
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // Global Reports & Audit State
    const [globalReports, setGlobalReports] = useState([]);
    const [reportFilter, setReportFilter] = useState('Report'); // 'Report', 'Work'
    const [periodFilter, setPeriodFilter] = useState('day'); // 'day', 'week', 'month', 'year'
    const [reportSearch, setReportSearch] = useState('');
    const [isLoadingReports, setIsLoadingReports] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [auditData, setAuditData] = useState([]);
    const [selectedMissingMember, setSelectedMissingMember] = useState(null);
    const [missingReason, setMissingReason] = useState('');
    const [isSavingMissingReason, setIsSavingMissingReason] = useState(false);
    const [expandedMembers, setExpandedMembers] = useState({});
    const [previewFile, setPreviewFile] = useState(null);
    const searchDebounceRef = useRef(null);

    // Admin User Listing State
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
    const [adminNewPassword, setAdminNewPassword] = useState('');
    const [isSavingAdminPassword, setIsSavingAdminPassword] = useState(false);
    const [showAdminResetPassword, setShowAdminResetPassword] = useState(false);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await api.put('/users/me', { name, email });
            updateUser({ name, email });
            toast.success('Profile updated successfully.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setIsSavingPassword(true);
        try {
            await api.put('/auth/change-password', { currentPassword, newPassword });
            toast.success('Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    // Fetch teams and users when Admin tab is opened
    const handleAdminTabClick = async () => {
        setActiveTab('admin_users');
        if (teams.length === 0) {
            try { const res = await api.get('/teams'); setTeams(res.data); } catch { /* ignore */ }
        }
        fetchUsers();
    };

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch (err) {
            toast.error('Failed to fetch user list');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleAdminPasswordReset = async (e) => {
        e.preventDefault();
        if (!selectedUserForPassword || !adminNewPassword) return;
        setIsSavingAdminPassword(true);
        try {
            await api.put(`/admin/users/${selectedUserForPassword.id}/password`, { newPassword: adminNewPassword });
            toast.success(`Password reset for ${selectedUserForPassword.name}`);
            setAdminNewPassword('');
            setSelectedUserForPassword(null);
            setShowAdminResetPassword(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsSavingAdminPassword(false);
        }
    };

    const getDateRange = (date, period) => {
        const base = new Date(`${date}T00:00:00`);
        const start = new Date(base);
        const end = new Date(base);

        if (period === 'week') {
            const day = base.getDay();
            const diffToMonday = (day + 6) % 7;
            start.setDate(base.getDate() - diffToMonday);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'month') {
            start.setDate(1);
            end.setMonth(start.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (period === 'year') {
            start.setMonth(0, 1);
            end.setMonth(11, 31);
            end.setHours(23, 59, 59, 999);
        } else {
            end.setHours(23, 59, 59, 999);
        }

        return {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        };
    };

    const toDateInput = (d) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getWeekInputValue = (dateStr) => {
        const date = new Date(`${dateStr}T00:00:00`);
        const day = date.getDay() || 7;
        date.setDate(date.getDate() + 4 - day);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
        return `${date.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const weekValueToDate = (weekValue) => {
        const [yearStr, weekStr] = weekValue.split('-W');
        const year = parseInt(yearStr, 10);
        const week = parseInt(weekStr, 10);
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const day = simple.getDay();
        const monday = new Date(simple);
        if (day <= 4) monday.setDate(simple.getDate() - simple.getDay() + 1);
        else monday.setDate(simple.getDate() + 8 - simple.getDay());
        return toDateInput(monday);
    };

    const getMonthInputValue = (dateStr) => {
        const d = new Date(`${dateStr}T00:00:00`);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const fetchGlobalReports = async (type = reportFilter, date = selectedDate, period = periodFilter, search = reportSearch) => {
        setIsLoadingReports(true);
        setReportFilter(type);
        try {
            const { startDate, endDate } = getDateRange(date, period);
            let params = { type, startDate, endDate };
            if (search?.trim()) params.fileName = search.trim();

            const res = await api.get('/reports', { params });
            setGlobalReports(res.data);

            if (type === 'Report' && period === 'day') fetchReportAudit(date);
            else setAuditData([]);
        } catch {
            toast.error('Failed to fetch reports');
        } finally {
            setIsLoadingReports(false);
        }
    };

    const fetchReportAudit = async (date) => {
        try {
            const res = await api.get('/reports/audit', { params: { date } });
            setAuditData(res.data);
        } catch (err) {
            console.error("Audit fetch failed", err);
        }
    };

    const handleGlobalReportsTabClick = () => {
        setActiveTab('global_reports');
        fetchGlobalReports('Report', selectedDate, periodFilter, reportSearch);
    };

    const handleDateChange = (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        fetchGlobalReports(reportFilter, newDate, periodFilter, reportSearch);
    };

    const handleWeekChange = (e) => {
        const dateFromWeek = weekValueToDate(e.target.value);
        setSelectedDate(dateFromWeek);
        fetchGlobalReports(reportFilter, dateFromWeek, 'week', reportSearch);
    };

    const handleMonthChange = (e) => {
        const [year, month] = e.target.value.split('-');
        const dateFromMonth = `${year}-${month}-01`;
        setSelectedDate(dateFromMonth);
        fetchGlobalReports(reportFilter, dateFromMonth, 'month', reportSearch);
    };

    const handleYearChange = (e) => {
        const dateFromYear = `${e.target.value}-01-01`;
        setSelectedDate(dateFromYear);
        fetchGlobalReports(reportFilter, dateFromYear, 'year', reportSearch);
    };

    useEffect(() => {
        if (activeTab !== 'global_reports' && activeTab !== 'my_submissions') return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            fetchGlobalReports(reportFilter, selectedDate, periodFilter, reportSearch);
        }, 350);
        return () => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, [reportSearch]);

    const toggleMemberExpand = (memberName) => {
        setExpandedMembers(prev => ({
            ...prev,
            [memberName]: !prev[memberName]
        }));
    };

    const openMissingReasonModal = (member) => {
        setSelectedMissingMember(member);
        setMissingReason(member?.missing_reason || '');
    };

    const closeMissingReasonModal = () => {
        setSelectedMissingMember(null);
        setMissingReason('');
        setIsSavingMissingReason(false);
    };

    const handleSaveMissingReason = async () => {
        if (!selectedMissingMember?.id) return;
        const reasonText = missingReason.trim();
        if (!reasonText) {
            toast.error('Please enter a reason');
            return;
        }
        setIsSavingMissingReason(true);
        try {
            await api.post('/reports/audit/comment', {
                targetUserId: selectedMissingMember.id,
                auditDate: selectedDate,
                comment: reasonText
            });
            toast.success(`Saved reason for ${selectedMissingMember.name}`);
            await fetchReportAudit(selectedDate);
            closeMissingReasonModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save reason');
            setIsSavingMissingReason(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreatingUser(true);
        try {
            const res = await api.post('/admin/users', {
                name: newUserName, email: newUserEmail,
                password: newUserPassword, role: newUserRole
            });
            if (newUserTeamId && res.data?.id) {
                await api.post(`/teams/${newUserTeamId}/members`, { user_id: res.data.id });
            }
            toast.success(`Account created for ${newUserName}!`);
            setNewUserName(''); setNewUserEmail(''); setNewUserPassword('');
            setNewUserRole('Member'); setNewUserTeamId('');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create user account');
        } finally {
            setIsCreatingUser(false);
        }
    };

    const buildDownloadUrl = (fileUrl) => {
        const absolute = getAbsoluteFileUrl(fileUrl || '');
        const token = localStorage.getItem('token');
        if (!token) return absolute;
        return `${absolute}${absolute.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    };

    const submittedMembers = auditData.filter((m) => m.has_submitted);
    const missingWithReason = auditData.filter((m) => !m.has_submitted && (m.missing_reason || '').trim());
    const missingWithoutReason = auditData.filter((m) => !m.has_submitted && !(m.missing_reason || '').trim());

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
                <p className="text-sm text-slate-500 mt-1">Manage your personal profile and security preferences.</p>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                {/* Sidebar Tabs */}
                <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 shrink-0">
                    <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'profile' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <User className="w-4 h-4 mr-3" /> Profile Details
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'password' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Lock className="w-4 h-4 mr-3" /> Security & Password
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'notifications' ? 'bg-primary-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Bell className="w-4 h-4 mr-3" /> Notifications
                        </button>
                        {user?.role === 'Admin' && (
                            <button
                                onClick={handleAdminTabClick}
                                className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'admin_users' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <Users className="w-4 h-4 mr-3" /> User Management
                            </button>
                        )}
                        {user?.role === 'Admin' && (
                            <button
                                onClick={handleGlobalReportsTabClick}
                                className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'global_reports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <FileText className="w-4 h-4 mr-3" /> Global Reports
                            </button>
                        )}
                        {user?.role !== 'Admin' && (
                            <button
                                onClick={() => {
                                    setActiveTab('my_submissions');
                                    fetchGlobalReports(reportFilter, selectedDate, periodFilter, reportSearch);
                                }}
                                className={`flex-1 md:w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-w-max ${activeTab === 'my_submissions' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                <ArrowUpRight className="w-4 h-4 mr-3" /> My Submissions
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-8">
                    {activeTab === 'profile' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Profile Information</h2>
                            <form onSubmit={handleProfileSubmit} className="space-y-5">
                                <div>
                                    <label className="label-field">Full Name</label>
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} required disabled={user?.role === 'Member'} className={`input-field ${user?.role === 'Member' ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-slate-50'}`} />
                                </div>
                                <div>
                                    <label className="label-field">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={user?.role === 'Member'} className={`input-field ${user?.role === 'Member' ? 'bg-slate-100 cursor-not-allowed opacity-75' : 'bg-slate-50'}`} />
                                </div>
                                {user?.role !== 'Member' && (
                                    <div className="pt-4 flex justify-end">
                                        <button type="submit" disabled={isSavingProfile} className="btn-primary">
                                            {isSavingProfile ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Change Password</h2>
                            <form onSubmit={handlePasswordSubmit} className="space-y-5">
                                <div>
                                    <label className="label-field">Current Password</label>
                                    <div className="relative">
                                        <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="input-field pr-10" />
                                        <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                            {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-field">New Password</label>
                                    <div className="relative">
                                        <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="input-field pr-10" minLength={8} />
                                        <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400" onClick={() => setShowNewPassword(!showNewPassword)}>
                                            {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={isSavingPassword} className="btn-primary">
                                        {isSavingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="max-w-xl animate-in fade-in">
                            <h2 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-2">Email Notifications</h2>
                            <div className="space-y-4">
                                <label className="flex items-center">
                                    <input type="checkbox" defaultChecked className="rounded text-primary-blue h-4 w-4" />
                                    <span className="ml-3 text-sm text-slate-700">Receive email notifications</span>
                                </label>
                            </div>
                            <div className="pt-8 flex justify-end">
                                <button className="btn-primary">Save Preferences</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'admin_users' && user?.role === 'Admin' && (
                        <div className="space-y-10 animate-in fade-in max-w-4xl mx-auto">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-indigo-600" /> Create Account
                                </h2>
                                <form onSubmit={handleCreateUser} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} required className="input-field" placeholder="Full Name" />
                                        <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} required className="input-field">
                                            <option value="Member">Member</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                    <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="input-field" placeholder="Email Address" />
                                    <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required minLength={8} className="input-field" placeholder="Password" />
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" disabled={isCreatingUser} className="btn-primary">
                                            {isCreatingUser ? 'Creating...' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-lg font-bold text-slate-900">User List</h2>
                                    <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search..." className="input-field max-w-xs" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-black">
                                                <th className="pb-3">User</th>
                                                <th className="pb-3">Role</th>
                                                <th className="pb-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                                <tr key={u.id}>
                                                    <td className="py-4">
                                                        <p className="text-sm font-bold text-slate-900">{u.name}</p>
                                                        <p className="text-xs text-slate-500">{u.email}</p>
                                                    </td>
                                                    <td className="py-4 font-bold text-xs">{u.role}</td>
                                                    <td className="py-4 text-right">
                                                        <button onClick={() => { setSelectedUserForPassword(u); setShowAdminResetPassword(true); }} className="p-2 text-slate-400 hover:text-indigo-600">
                                                            <Lock className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'global_reports' && user?.role === 'Admin' && (
                        <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-emerald-900 flex items-center">
                                        <FileText className="w-5 h-5 mr-2 text-emerald-600" /> Audit
                                    </h2>
                                    <input type="date" value={selectedDate} onChange={handleDateChange} className="input-field max-w-xs" />
                                </div>
                                <div className="flex gap-2">
                                    {['day', 'week', 'month'].map(p => (
                                        <button key={p} onClick={() => { setPeriodFilter(p); fetchGlobalReports(reportFilter, selectedDate, p); }} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${periodFilter === p ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{p}</button>
                                    ))}
                                </div>
                            </div>

                            {isLoadingReports ? <div className="py-20 text-center">Loading...</div> : (
                                <div className="space-y-4">
                                    {globalReports.map(upload => (
                                        <div key={upload.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{upload.file_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{upload.user_name} • {upload.file_type}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setPreviewFile(upload)} className="p-2 text-slate-400 border rounded-lg"><Eye className="w-4 h-4" /></button>
                                                <a href={buildDownloadUrl(upload.file_url)} target="_blank" rel="noreferrer" className="p-2 text-slate-400 border rounded-lg"><Download className="w-4 h-4" /></a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'my_submissions' && (
                        <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
                            <div className="bg-white p-5 border rounded-2xl flex justify-between items-center">
                                <h2 className="text-lg font-bold text-indigo-900">My Reports</h2>
                                <input type="date" value={selectedDate} onChange={handleDateChange} className="input-field max-w-xs" />
                            </div>
                            <div className="space-y-3">
                                {globalReports.map(upload => (
                                    <div key={upload.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center">
                                        <p className="text-sm font-bold">{upload.file_name}</p>
                                        <button onClick={() => setPreviewFile(upload)} className="p-2 text-indigo-600 border rounded-lg"><Eye className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}

            {showAdminResetPassword && selectedUserForPassword && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Reset Password for {selectedUserForPassword.name}</h3>
                            <button onClick={() => setShowAdminResetPassword(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAdminPasswordReset} className="space-y-4">
                            <input type="password" value={adminNewPassword} onChange={e => setAdminNewPassword(e.target.value)} required minLength={8} className="input-field" placeholder="New Password" autoFocus />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAdminResetPassword(false)} className="px-4 py-2 border rounded-xl text-xs font-bold uppercase">Cancel</button>
                                <button type="submit" disabled={isSavingAdminPassword} className="btn-primary">{isSavingAdminPassword ? 'Saving...' : 'Reset'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
