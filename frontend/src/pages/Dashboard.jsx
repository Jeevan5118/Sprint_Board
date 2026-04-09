import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, CheckCircle2, AlertCircle, PlayCircle, Users, X, FileText, Upload, ShieldAlert, CircleDashed, Target } from 'lucide-react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const TeamAnalyticsModal = ({ isOpen, onClose, filter, teamData, isPowerHour = false }) => {
    if (!isOpen) return null;

    const filterLabel = {
        total: 'Total Tasks',
        completed: 'Completed',
        inReview: 'In Review',
        overdue: 'Overdue',
        atRisk: 'At Risk',
        completionRate7d: '7-Day Completion Rate'
    }[filter] || 'Team Metric';

    const contextPath = isPowerHour ? 'power-hour-projects' : 'teams';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-bold text-slate-900">Team Analytics - {filterLabel}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="space-y-4">
                    {teamData.map(t => (
                        <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-slate-900">{t.name}</h4>
                                <div className="flex items-center space-x-3 text-sm">
                                    <span className="text-slate-500 font-medium">{t.total} tasks</span>
                                    <Link to={isPowerHour ? '/power-hour-projects' : `/${contextPath}/${t.id}/sprint-board`} className="text-primary-blue hover:text-blue-800 font-bold text-xs flex items-center">
                                        {isPowerHour ? 'View Projects' : 'View Board'} <ArrowUpRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </div>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden border border-slate-200/50">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: t.total > 0 ? `${Math.round((t.done / t.total) * 100)}%` : '0%' }} />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                <MetricPill label="Total" value={t.total} />
                                <MetricPill label="Done" value={t.done} className="text-emerald-700 bg-emerald-50 border-emerald-200" />
                                <MetricPill label="In Review" value={t.inReview} className="text-violet-700 bg-violet-50 border-violet-200" />
                                <MetricPill label="Overdue" value={t.overdue} className="text-rose-700 bg-rose-50 border-rose-200" />
                                <MetricPill label="7d Rate" value={`${t.completionRate7d}%`} className="text-blue-700 bg-blue-50 border-blue-200" />
                            </div>
                        </div>
                    ))}
                    {teamData.length === 0 && (
                        <div className="py-20 text-center">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No team data available yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricPill = ({ label, value, className = '' }) => (
    <div className={`rounded-xl p-2.5 border bg-slate-50 border-slate-200 ${className}`}>
        <p className="text-sm font-black">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{label}</p>
    </div>
);

const Dashboard = ({ isPowerHour = false }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState(null);
    const [analyticsModal, setAnalyticsModal] = useState(null);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isUploadingWork, setIsUploadingWork] = useState(false);
    const [recentUploads, setRecentUploads] = useState([]);
    const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

    const normalizeDashboardData = (raw) => ({
        analytics: {
            totalTasks: Number(raw?.analytics?.totalTasks || 0),
            completed: Number(raw?.analytics?.completed || 0),
            pending: Number(raw?.analytics?.pending || 0),
            inReview: Number(raw?.analytics?.inReview || 0),
            overdue: Number(raw?.analytics?.overdue || 0),
            atRisk: Number(raw?.analytics?.atRisk || 0),
            reviewBacklog: Number(raw?.analytics?.reviewBacklog || 0),
            slaBreach: Number(raw?.analytics?.slaBreach || 0),
            doneLast7Days: Number(raw?.analytics?.doneLast7Days || 0),
            completionRate7d: Number(raw?.analytics?.completionRate7d || 0),
            reviewTurnaroundHours: Number(raw?.analytics?.reviewTurnaroundHours || 0),
            progress: Number(raw?.analytics?.progress || 0),
        },
        teams: Array.isArray(raw?.teams) ? raw.teams : [],
        alerts: Array.isArray(raw?.alerts) ? raw.alerts : [],
        timeline: Array.isArray(raw?.timeline) ? raw.timeline : [],
    });

    const fetchDashboard = async () => {
        setIsLoading(true);
        try {
            const [dashResult, uploadsResult] = await Promise.allSettled([
                api.get(`/dashboard/analytics?is_power_hour=${isPowerHour}`),
                api.get('/reports')
            ]);

            if (dashResult.status === 'fulfilled') {
                setData(normalizeDashboardData(dashResult.value.data));
            } else {
                setData(null);
                toast.error('Failed to load dashboard data');
            }

            if (uploadsResult.status === 'fulfilled' && Array.isArray(uploadsResult.value.data)) {
                setRecentUploads(uploadsResult.value.data);
            } else {
                setRecentUploads([]);
            }
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
            setData(null);
            setRecentUploads([]);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const resolveUploadTeamId = async () => {
        if (data?.teams?.length > 0) return data.teams[0].id;
        try {
            const { data: teams } = await api.get(`/teams?is_power_hour=${isPowerHour}`);
            return Array.isArray(teams) && teams.length > 0 ? teams[0].id : null;
        } catch {
            return null;
        }
    };

    const handleReportSubmit = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error('File too large. Maximum allowed size is 50MB.');
            e.target.value = '';
            return;
        }

        setIsSubmittingReport(true);
        const formData = new FormData();
        formData.append('report', file);
        formData.append('is_power_hour', isPowerHour);
        const teamId = await resolveUploadTeamId();
        if (teamId) formData.append('teamId', teamId);

        const loadingToast = toast.loading(`Uploading ${file.name}...`);
        try {
            await api.post('/reports/submit', formData);
            toast.success("Today's report submitted successfully!", { id: loadingToast });
            fetchDashboard();
        } catch (err) {
            const message = err.response?.data?.message || 'Internal Server Error';
            toast.error(`Upload Error: ${message}`, { id: loadingToast, duration: 6000 });
        } finally {
            setIsSubmittingReport(false);
            e.target.value = '';
        }
    };

    const handleWorkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            toast.error('File too large. Maximum allowed size is 50MB.');
            e.target.value = '';
            return;
        }

        setIsUploadingWork(true);
        const formData = new FormData();
        formData.append('work', file);
        formData.append('is_power_hour', isPowerHour);
        const teamId = await resolveUploadTeamId();
        if (teamId) formData.append('teamId', teamId);

        const loadingToast = toast.loading(`Uploading ${file.name}...`);
        try {
            await api.post('/reports/work', formData);
            toast.success('Work uploaded successfully!', { id: loadingToast });
            fetchDashboard();
        } catch (err) {
            const message = err.response?.data?.message || 'Internal Server Error';
            toast.error(`Upload Error: ${message}`, { id: loadingToast, duration: 6000 });
        } finally {
            setIsUploadingWork(false);
            e.target.value = '';
        }
    };

    const canSubmitReport = user?.role === 'Member' || user?.role === 'Team Lead';

    useEffect(() => {
        fetchDashboard();
    }, [isPowerHour]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                <p>No data available. Please try again.</p>
            </div>
        );
    }

    const cards = [
        { key: 'total', label: 'Total Tasks', value: data.analytics.totalTasks, icon: CircleDashed, color: 'bg-slate-100 text-slate-700', textColor: 'text-slate-900' },
        { key: 'completed', label: 'Completed', value: data.analytics.completed, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700', textColor: 'text-emerald-700' },
        { key: 'inReview', label: 'In Review', value: data.analytics.inReview, icon: Clock, color: 'bg-violet-100 text-violet-700', textColor: 'text-violet-700' },
        { key: 'overdue', label: 'Overdue', value: data.analytics.overdue, icon: AlertCircle, color: 'bg-rose-100 text-rose-700', textColor: 'text-rose-700' },
        { key: 'atRisk', label: 'At Risk', value: data.analytics.atRisk, icon: ShieldAlert, color: 'bg-amber-100 text-amber-700', textColor: 'text-amber-700' },
        { key: 'completionRate7d', label: '7-Day Completion', value: `${data.analytics.completionRate7d}%`, icon: Target, color: 'bg-blue-100 text-blue-700', textColor: 'text-blue-700' },
    ];

    const contextPath = isPowerHour ? 'power-hour-projects' : 'teams';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isPowerHour ? 'Power Hour Dashboard' : 'Dashboard'}</h1>
                    <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.name}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {canSubmitReport && (
                        <div className="relative">
                            <input type="file" id="report-upload" className="hidden" onChange={handleReportSubmit} disabled={isSubmittingReport} />
                            <label htmlFor="report-upload" className={`flex items-center justify-center px-4 py-2.5 bg-primary-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-blue/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all cursor-pointer ${isSubmittingReport ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <FileText className="w-4 h-4 mr-2" />
                                {isSubmittingReport ? 'Submitting...' : 'Daily Report'}
                                <Upload className="w-3.5 h-3.5 ml-2 opacity-70" />
                            </label>
                        </div>
                    )}
                    {canSubmitReport && (
                        <div className="relative">
                            <input type="file" id="work-upload" className="hidden" onChange={handleWorkUpload} disabled={isUploadingWork} />
                            <label htmlFor="work-upload" className={`flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all cursor-pointer ${isUploadingWork ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <Upload className="w-4 h-4 mr-2" />
                                {isUploadingWork ? 'Uploading...' : 'Upload Work'}
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {cards.map(card => (
                    <button key={card.key} onClick={() => setAnalyticsModal(card.key)} className="card flex items-center p-4 text-left hover:shadow-md hover:-translate-y-0.5 transform transition-all cursor-pointer group">
                        <div className={`p-2.5 rounded-full ${card.color} mr-3 group-hover:scale-110 transition-transform`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
                            <p className={`text-xl font-bold ${card.textColor}`}>{card.value}</p>
                        </div>
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                <div className="xl:col-span-3 space-y-6">
                    {!isPowerHour ? (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <Users className="w-5 h-5 mr-2 text-slate-500" />
                                    <h2 className="text-lg font-semibold text-slate-800">Team Delivery Board</h2>
                                </div>
                                <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                                    Review TAT: {data.analytics.reviewTurnaroundHours}h
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Team</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Active Sprint</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Review</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">7d Rate</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {data.teams.length === 0 && (
                                            <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">No teams found.</td></tr>
                                        )}
                                        {data.teams.map(team => (
                                            <tr key={team.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4 whitespace-nowrap font-medium text-slate-900">{team.name}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{team.activeSprint}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-violet-700 font-semibold">{team.inReview}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-rose-700 font-semibold">{team.overdue}</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-700 font-semibold">{team.completionRate7d}%</td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                    <Link to={`/${contextPath}/${team.id}/sprint-board`} className="text-primary-blue hover:text-blue-900">Sprint Board</Link>
                                                    <Link to={`/${contextPath}/${team.id}/kanban`} className="text-primary-blue hover:text-blue-900">Kanban</Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <h2 className="text-lg font-semibold text-slate-800">Power Hour Workspace</h2>
                            <p className="text-sm text-slate-600 mt-2">Power Hour runs as shared projects without team boards.</p>
                            <Link to="/power-hour-projects" className="inline-flex mt-4 text-sm font-semibold text-primary-blue hover:text-blue-900">
                                Open Power Hour Projects
                            </Link>
                        </div>
                    )}

                    <div className="card">
                        <div className="flex items-center mb-4">
                            <PlayCircle className="w-5 h-5 mr-2 text-slate-500" />
                            <h2 className="text-lg font-semibold text-slate-800">Recent Activity</h2>
                        </div>
                        {data.timeline.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-4">No recent activity.</p>
                        ) : (
                            <div className="flow-root">
                                <ul className="-mb-8">
                                    {data.timeline.map((event, idx) => (
                                        <li key={event.id}>
                                            <div className="relative pb-8">
                                                {idx !== data.timeline.length - 1 && <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" />}
                                                <div className="relative flex space-x-3">
                                                    <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center ring-8 ring-white">
                                                        <div className="w-2 h-2 bg-slate-400 rounded-full" />
                                                    </span>
                                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                                        <p className="text-sm text-slate-500">{event.text}</p>
                                                        <p className="whitespace-nowrap text-sm text-slate-400">{event.time}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card border-l-4 border-l-danger-red">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2 text-danger-red" />
                                <h2 className="text-lg font-semibold text-slate-800">Risk Desk</h2>
                            </div>
                            <span className="text-xs font-semibold text-rose-700">{data.analytics.slaBreach} SLA Breach</span>
                        </div>
                        <ul className="space-y-3">
                            {data.alerts.map(alert => (
                                <li key={alert.id} className={`p-3 rounded-md text-sm cursor-pointer hover:opacity-80 transition-opacity ${alert.type === 'overdue' ? 'bg-danger-red/10 text-danger-red' : 'bg-warning-amber/10 text-warning-amber'}`}>
                                    <Link to={alert.link} className="block w-full">{alert.message}</Link>
                                </li>
                            ))}
                            {data.alerts.length === 0 && <p className="text-sm text-slate-500">No active alerts.</p>}
                        </ul>
                    </div>

                    <div className="card">
                        <div className="flex items-center mb-4 text-emerald-600">
                            <FileText className="w-5 h-5 mr-2" />
                            <h2 className="text-lg font-semibold text-slate-800">Recent Uploads</h2>
                        </div>
                        <div className="space-y-4">
                            {recentUploads.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">No recent uploads found.</p>
                            ) : (
                                recentUploads.slice(0, 5).map(upload => (
                                    <div key={upload.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate block">{upload.file_name}</p>
                                            <div className="flex items-center mt-1 space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <span className={`px-1.5 py-0.5 rounded ${upload.file_type === 'Report' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {upload.file_type}
                                                </span>
                                                <span>{new Date(upload.uploaded_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <a href={upload.file_url} target="_blank" rel="noopener noreferrer" className="ml-4 p-2 text-slate-400 hover:text-primary-blue hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-200 shrink-0">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TeamAnalyticsModal
                isOpen={!!analyticsModal}
                onClose={() => setAnalyticsModal(null)}
                filter={analyticsModal}
                teamData={data.teams}
                isPowerHour={isPowerHour}
            />
        </div>
    );
};

export default Dashboard;
