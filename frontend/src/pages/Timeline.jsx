import { useMemo, useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Layers, Filter, CheckCircle2, AlertCircle, Clock, ZoomIn, ZoomOut, Search, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getRangeWindow = (range) => {
    const today = startOfDay(new Date());
    if (range === 'week') {
        return { start: addDays(today, -14), end: addDays(today, 28) };
    }
    if (range === 'quarter') {
        return { start: addDays(today, -45), end: addDays(today, 120) };
    }
    return { start: addDays(today, -30), end: addDays(today, 75) };
};

const Timeline = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [members, setMembers] = useState([]);
    const [sprints, setSprints] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [expandedSprints, setExpandedSprints] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [rangePreset, setRangePreset] = useState('month');
    const [zoomLevel, setZoomLevel] = useState(1);
    const [filters, setFilters] = useState({
        myTasksOnly: false,
        status: '',
        priority: '',
        assignee: '',
        search: ''
    });

    const windowRange = useMemo(() => getRangeWindow(rangePreset), [rangePreset]);
    const totalDurationMs = Math.max(windowRange.end.getTime() - windowRange.start.getTime(), 1);
    const timelineMinWidth = Math.round(1200 * zoomLevel);
    const todayPos = ((startOfDay(new Date()).getTime() - windowRange.start.getTime()) / totalDurationMs) * 100;

    const months = useMemo(() => {
        const result = [];
        const cursor = new Date(windowRange.start.getFullYear(), windowRange.start.getMonth(), 1);
        while (cursor <= windowRange.end) {
            result.push({
                key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
                label: cursor.toLocaleString('default', { month: 'short', year: 'numeric' })
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return result;
    }, [windowRange.start, windowRange.end]);

    const fetchContext = async () => {
        try {
            const { data } = await api.get('/teams');
            setTeams(data || []);
            if ((data || []).length > 0) setSelectedTeamId(data[0].id);
        } catch (err) {
            console.error('Failed to load teams:', err);
            toast.error('Failed to load teams for timeline');
        } finally {
            setIsLoading(false);
        }
    };

    const loadTimelineData = async () => {
        if (!selectedTeamId) return;
        setIsLoading(true);
        try {
            const [sprintRes, taskRes, memberRes] = await Promise.all([
                api.get(`/teams/${selectedTeamId}/sprints`),
                api.get(`/teams/${selectedTeamId}/tasks`),
                api.get(`/teams/${selectedTeamId}/members`)
            ]);
            setSprints(sprintRes.data || []);
            setTasks(taskRes.data || []);
            setMembers(memberRes.data || []);
            const active = (sprintRes.data || []).find((s) => s.status === 'Active');
            if (active) setExpandedSprints({ [active.id]: true });
        } catch (err) {
            console.error('Failed to load timeline data', err);
            toast.error('Failed to load timeline details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchContext();
    }, []);

    useEffect(() => {
        loadTimelineData();
    }, [selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleSprint = (sprintId) => {
        setExpandedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
    };

    const getBarStyles = (startStr, endStr, fallbackDays = 7) => {
        const start = startStr ? new Date(startStr) : new Date();
        const end = endStr ? new Date(endStr) : addDays(start, fallbackDays);
        let s = start.getTime();
        let e = end.getTime();
        if (e < windowRange.start.getTime() || s > windowRange.end.getTime()) return { display: 'none' };
        s = Math.max(s, windowRange.start.getTime());
        e = Math.min(e, windowRange.end.getTime());
        const left = ((s - windowRange.start.getTime()) / totalDurationMs) * 100;
        const width = Math.max(((e - s) / totalDurationMs) * 100, 1);
        return { left: `${left}%`, width: `${width}%` };
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            if (filters.myTasksOnly && task.assignee_id !== user?.id) return false;
            if (filters.status && task.status !== filters.status) return false;
            if (filters.priority && task.priority !== filters.priority) return false;
            if (filters.assignee && task.assignee_id !== filters.assignee) return false;
            if (filters.search && !`${task.title || ''} ${task.description || ''}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
            return true;
        });
    }, [tasks, filters, user?.id]);

    const timelineSummary = useMemo(() => {
        const total = filteredTasks.length;
        const done = filteredTasks.filter((t) => t.status === 'Done').length;
        const review = filteredTasks.filter((t) => t.status === 'Review').length;
        const overdue = filteredTasks.filter((t) => t.status !== 'Done' && t.due_date && new Date(t.due_date) < new Date()).length;
        return { total, done, review, overdue };
    }, [filteredTasks]);

    if (isLoading && !teams.length) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;
    }

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in duration-500 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-3 text-indigo-600" />
                            Timeline Roadmap
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Professional planning timeline with sprint and task bars.</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex gap-2">
                        <button onClick={loadTimelineData} className="btn-secondary text-xs flex items-center justify-center">
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                        </button>
                        <button
                            onClick={() => {
                                const container = document.getElementById('timeline-viewport');
                                const marker = document.getElementById('today-marker');
                                if (container && marker) {
                                    container.scrollTo({ left: marker.offsetLeft - container.clientWidth / 2, behavior: 'smooth' });
                                }
                            }}
                            className="btn-secondary text-xs flex items-center justify-center"
                        >
                            <Clock className="w-3.5 h-3.5 mr-1" /> Today
                        </button>
                        <button onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.2))} className="btn-secondary text-xs flex items-center justify-center">
                            <ZoomOut className="w-3.5 h-3.5 mr-1" /> Zoom
                        </button>
                        <button onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))} className="btn-secondary text-xs flex items-center justify-center">
                            <ZoomIn className="w-3.5 h-3.5 mr-1" /> Zoom
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-2">
                    <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="input-field text-sm lg:col-span-2">
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select value={rangePreset} onChange={(e) => setRangePreset(e.target.value)} className="input-field text-sm lg:col-span-1">
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                        <option value="quarter">Quarter</option>
                    </select>
                    <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} className="input-field text-sm lg:col-span-1">
                        <option value="">All Status</option>
                        <option value="Backlog">Backlog</option>
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Done">Done</option>
                    </select>
                    <select value={filters.priority} onChange={(e) => setFilters((p) => ({ ...p, priority: e.target.value }))} className="input-field text-sm lg:col-span-1">
                        <option value="">All Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                    <select value={filters.assignee} onChange={(e) => setFilters((p) => ({ ...p, assignee: e.target.value }))} className="input-field text-sm lg:col-span-1">
                        <option value="">All Assignees</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <div className="relative lg:col-span-2">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} placeholder="Search task..." className="w-full input-field text-sm pl-9" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setFilters((p) => ({ ...p, myTasksOnly: !p.myTasksOnly }))} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${filters.myTasksOnly ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <Filter className="w-3.5 h-3.5 inline mr-1" />
                        {filters.myTasksOnly ? 'My Tasks' : 'All Tasks'}
                    </button>
                    <span className="text-xs text-slate-500 bg-white border border-slate-200 rounded-md px-2 py-1">Total: {timelineSummary.total}</span>
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">Done: {timelineSummary.done}</span>
                    <span className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-md px-2 py-1">Review: {timelineSummary.review}</span>
                    <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">Overdue: {timelineSummary.overdue}</span>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white z-10 shadow-[4px_0_12px_rgba(0,0,0,0.015)] flex flex-col">
                    <div className="h-12 border-b border-slate-200 bg-slate-50/80 flex items-center px-4 sticky top-0 font-bold text-[10px] text-slate-400 uppercase tracking-widest z-20">
                        Work Items and Sprints
                    </div>
                    <div className="py-2">
                        {sprints.map((sprint) => {
                            const isExpanded = !!expandedSprints[sprint.id];
                            const sprintTasks = filteredTasks.filter((t) => t.sprint_id === sprint.id);
                            return (
                                <div key={sprint.id} className="border-b border-slate-50 last:border-0">
                                    <div onClick={() => toggleSprint(sprint.id)} className={`flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50/30' : ''}`}>
                                        <button className="mr-2 text-slate-300 group-hover:text-slate-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <div className={`p-1 rounded mr-2 ${sprint.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Layers className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-sm font-bold truncate flex-1 text-slate-700">{sprint.name}</span>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">{sprintTasks.length}</span>
                                    </div>
                                    {isExpanded && sprintTasks.map((task) => (
                                        <div key={task.id} className="flex items-center pl-10 pr-4 py-2 hover:bg-slate-50 group border-l-2 border-slate-100 ml-6 mb-1 transition-all">
                                            <div className={`w-1.5 h-1.5 rounded-full mr-3 ${task.status === 'Done' ? 'bg-emerald-400' : task.priority === 'Urgent' ? 'bg-rose-400' : 'bg-slate-300'}`} />
                                            <span className="truncate text-slate-500 font-medium text-[11px] flex-1 group-hover:text-slate-900" title={task.title}>{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div id="timeline-viewport" className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#fcfdfe]">
                    <div className="relative h-full flex flex-col" style={{ minWidth: `${timelineMinWidth}px` }}>
                        <div className="h-12 border-b border-slate-200 bg-slate-50/80 sticky top-0 flex items-center z-10">
                            {months.map((m) => (
                                <div key={m.key} className="flex-1 border-r border-slate-200/50 h-full flex items-center px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {m.label}
                                </div>
                            ))}
                        </div>

                        <div className="absolute inset-0 top-12 flex pointer-events-none z-0">
                            {months.map((m) => <div key={m.key} className="flex-1 border-r border-slate-100 h-full border-dashed"></div>)}
                            {todayPos >= 0 && todayPos <= 100 && (
                                <div id="today-marker" className="absolute top-0 bottom-0 w-[2px] bg-rose-500/40 z-20 shadow-[0_0_8px_rgba(244,63,94,0.3)] flex flex-col items-center" style={{ left: `${todayPos}%` }}>
                                    <div className="bg-rose-500 text-white text-[8px] font-black px-1 rounded-sm mt-1 whitespace-nowrap shadow-sm">TODAY</div>
                                </div>
                            )}
                        </div>

                        <div className="py-2 relative z-10">
                            {sprints.map((sprint) => {
                                const isExpanded = !!expandedSprints[sprint.id];
                                const sprintTasks = filteredTasks.filter((t) => t.sprint_id === sprint.id);
                                const sprintStyle = getBarStyles(sprint.start_date, sprint.end_date, 14);
                                return (
                                    <div key={sprint.id} className="relative">
                                        <div className="h-[48px] flex items-center relative">
                                            {sprintStyle.display !== 'none' && (
                                                <div className={`absolute h-7 rounded-lg shadow-sm border flex items-center px-3 truncate transition-all overflow-hidden z-10 ${sprint.status === 'Active' ? 'bg-indigo-600 border-indigo-700 text-white font-bold ring-4 ring-indigo-500/10' : 'bg-slate-100 border-slate-200 text-slate-700'}`} style={{ left: sprintStyle.left, width: sprintStyle.width, minWidth: '70px' }}>
                                                    <span className="text-[11px] truncate uppercase tracking-tighter">{sprint.name}</span>
                                                </div>
                                            )}
                                        </div>
                                        {isExpanded && sprintTasks.map((task) => {
                                            const start = task.created_at || sprint.start_date;
                                            const end = task.due_date || sprint.end_date;
                                            const taskStyle = getBarStyles(start, end, 4);
                                            return (
                                                <div key={task.id} className="h-[36px] flex items-center relative hover:bg-slate-50/50 transition-colors">
                                                    {taskStyle.display !== 'none' && (
                                                        <div className={`absolute h-6 rounded-md border flex items-center overflow-hidden cursor-pointer ${task.status === 'Done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : task.priority === 'Urgent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' : task.priority === 'High' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' : task.priority === 'Medium' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700' : 'bg-slate-400/10 border-slate-400/20 text-slate-600'}`} style={{ left: taskStyle.left, width: taskStyle.width, minWidth: '48px' }} title={`${task.title} - ${task.status}`}>
                                                            <div className="flex items-center px-2 space-x-2 truncate">
                                                                {task.status === 'Done' ? <CheckCircle2 className="w-2.5 h-2.5" /> : task.priority === 'Urgent' ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                                                {parseFloat(taskStyle.width) > 8 && <span className="text-[10px] font-bold truncate">{task.title}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center space-x-8">
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-md bg-rose-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urgent</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-md bg-amber-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-md bg-blue-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medium</span></div>
                <div className="flex items-center space-x-2"><div className="w-3 h-3 rounded-md bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Done</span></div>
                <div className="h-4 w-[1px] bg-slate-300 mx-2"></div>
                <div className="flex items-center space-x-2"><div className="w-4 h-[2px] bg-rose-500 opacity-60"></div><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today</span></div>
            </div>
        </div>
    );
};

export default Timeline;
