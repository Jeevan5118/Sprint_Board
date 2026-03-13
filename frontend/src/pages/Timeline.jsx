import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronDown, Layers, Filter, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';

const RoadmapTimeline = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [sprints, setSprints] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSprints, setExpandedSprints] = useState({});
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    // Chart Time Window (1 month ago to 3 months ahead)
    const today = new Date();
    const chartStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const chartEnd = new Date(today.getFullYear(), today.getMonth() + 3, 0); 
    const totalDuration = chartEnd.getTime() - chartStart.getTime();
    const todayPos = ((today.getTime() - chartStart.getTime()) / totalDuration) * 100;

    // Generate Month Columns for Header
    const months = [];
    let curr = new Date(chartStart);
    while (curr <= chartEnd) {
        months.push(curr.toLocaleString('default', { month: 'short', year: 'numeric' }));
        curr.setMonth(curr.getMonth() + 1);
    }

    useEffect(() => {
        const fetchContext = async () => {
            try {
                const { data } = await api.get('/teams');
                setTeams(data);
                if (data.length > 0) setSelectedTeamId(data[0].id);
            } catch (err) { console.error("Failed to load teams:", err); }
            finally { setIsLoading(false); }
        };
        fetchContext();
    }, []);

    useEffect(() => {
        const loadTimelineData = async () => {
            if (!selectedTeamId) return;
            setIsLoading(true);
            try {
                const [sprintRes, taskRes] = await Promise.all([
                    api.get(`/teams/${selectedTeamId}/sprints`),
                    api.get(`/teams/${selectedTeamId}/tasks`)
                ]);
                setSprints(sprintRes.data);
                setTasks(taskRes.data);
                const active = sprintRes.data.find(s => s.status === 'Active');
                if (active) setExpandedSprints({ [active.id]: true });
            } catch (err) { console.error("Failed to load timeline data", err); }
            finally { setIsLoading(false); }
        };
        loadTimelineData();
    }, [selectedTeamId]);

    const toggleSprint = (sprintId) => {
        setExpandedSprints(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
    };

    const getBarStyles = (startStr, endStr, fallbackDays = 7) => {
        const s = startStr ? new Date(startStr) : new Date();
        const e = endStr ? new Date(endStr) : new Date(s.getTime() + fallbackDays * 24 * 60 * 60 * 1000);
        let start = s.getTime();
        let end = e.getTime();
        if (end < chartStart.getTime() || start > chartEnd.getTime()) return { display: 'none' };
        start = Math.max(start, chartStart.getTime());
        end = Math.min(end, chartEnd.getTime());
        const left = ((start - chartStart.getTime()) / totalDuration) * 100;
        const width = Math.max(((end - start) / totalDuration) * 100, 1);
        return { left: `${left}%`, width: `${width}%` };
    };

    const getPriorityColor = (priority, status) => {
        if (status === 'Done') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700';
        switch (priority) {
            case 'Urgent': return 'bg-rose-500/10 border-rose-500/20 text-rose-700';
            case 'High': return 'bg-amber-500/10 border-amber-500/20 text-amber-700';
            case 'Medium': return 'bg-blue-500/10 border-blue-500/20 text-blue-700';
            default: return 'bg-slate-400/10 border-slate-400/20 text-slate-600';
        }
    };

    const filteredTasks = myTasksOnly ? tasks.filter(t => t.assignee_id === user.id) : tasks;

    if (isLoading && !teams.length) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue"></div></div>;
    }

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in duration-500 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-200 bg-slate-50 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <CalendarIcon className="w-6 h-6 mr-3 text-indigo-600" /> 
                        Roadmap Timeline
                    </h1>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <button 
                        onClick={() => {
                            const container = document.getElementById('timeline-viewport');
                            if (container) {
                                const todayEl = document.getElementById('today-marker');
                                if (todayEl) {
                                    container.scrollTo({ left: todayEl.offsetLeft - (container.clientWidth / 2), behavior: 'smooth' });
                                }
                            }
                        }}
                        className="btn-secondary py-1.5 text-xs flex items-center"
                    >
                        <Clock className="w-3.5 h-3.5 mr-2" /> Jump to Today
                    </button>
                    <button 
                        onClick={() => setMyTasksOnly(!myTasksOnly)}
                        className={`flex items-center px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${myTasksOnly ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-3.5 h-3.5 mr-2" />
                        {myTasksOnly ? 'Viewing My Tasks' : 'Filter: All Tasks'}
                    </button>
                    <select
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                        className="input-field py-1.5 text-sm font-semibold w-48 shadow-sm bg-white"
                    >
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 flex-shrink-0 border-r border-slate-200 overflow-y-auto bg-white z-10 shadow-[4px_0_12px_rgba(0,0,0,0.015)] flex flex-col">
                    <div className="h-12 border-b border-slate-200 bg-slate-50/80 flex items-center px-4 sticky top-0 font-bold text-[10px] text-slate-400 uppercase tracking-widest z-20">
                        Work Items & Sprints
                    </div>
                    <div className="py-2">
                        {sprints.map(sprint => {
                            const isExpanded = expandedSprints[sprint.id];
                            const sprintTasks = filteredTasks.filter(t => t.sprint_id === sprint.id);
                            return (
                                <div key={sprint.id} className="border-b border-slate-50 last:border-0">
                                    <div 
                                        onClick={() => toggleSprint(sprint.id)}
                                        className={`flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors group ${isExpanded ? 'bg-slate-50/30' : ''}`}
                                    >
                                        <button className="mr-2 text-slate-300 group-hover:text-slate-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                        <div className={`p-1 rounded mr-2 ${sprint.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Layers className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={`text-sm font-bold truncate flex-1 ${sprint.status === 'Active' ? 'text-slate-900 underline decoration-emerald-500/30' : 'text-slate-600'}`}>
                                            {sprint.name}
                                        </span>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">
                                            {sprintTasks.length}
                                        </span>
                                    </div>
                                    {isExpanded && sprintTasks.map(task => (
                                        <div key={task.id} className="flex items-center pl-10 pr-4 py-2 hover:bg-slate-50 group border-l-2 border-slate-100 ml-6 mb-1 transition-all">
                                            <div className={`w-1.5 h-1.5 rounded-full mr-3 ${task.status === 'Done' ? 'bg-emerald-400' : task.priority === 'Urgent' ? 'bg-rose-400' : 'bg-slate-300'}`}></div>
                                            <span className="truncate text-slate-500 font-medium text-[11px] flex-1 group-hover:text-slate-900" title={task.title}>{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div id="timeline-viewport" className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#fcfdfe]">
                    <div className="min-w-[1000px] relative h-full flex flex-col">
                        <div className="h-12 border-b border-slate-200 bg-slate-50/80 sticky top-0 flex items-center z-10">
                            {months.map((m, i) => (
                                <div key={i} className="flex-1 border-r border-slate-200/50 h-full flex items-center px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {m}
                                </div>
                            ))}
                        </div>

                        <div className="absolute inset-0 top-12 flex pointer-events-none z-0">
                            {months.map((_, i) => <div key={i} className="flex-1 border-r border-slate-100 h-full border-dashed"></div>)}
                            {todayPos >= 0 && todayPos <= 100 && (
                                <div id="today-marker" className="absolute top-0 bottom-0 w-[2px] bg-rose-500/40 z-20 shadow-[0_0_8px_rgba(244,63,94,0.3)] flex flex-col items-center" style={{ left: `${todayPos}%` }}>
                                    <div className="bg-rose-500 text-white text-[8px] font-black px-1 rounded-sm mt-1 whitespace-nowrap shadow-sm">TODAY</div>
                                </div>
                            )}
                        </div>

                        <div className="py-2 relative z-10">
                            {sprints.map(sprint => {
                                const isExpanded = expandedSprints[sprint.id];
                                const sprintTasks = filteredTasks.filter(t => t.sprint_id === sprint.id);
                                const sprintStyle = getBarStyles(sprint.start_date, sprint.end_date, 14);
                                return (
                                    <div key={sprint.id} className="relative">
                                        <div className="h-[48px] flex items-center relative group">
                                           {sprintStyle.display !== 'none' && (
                                                <div 
                                                    className={`absolute h-7 rounded-lg shadow-sm border flex items-center px-3 truncate transition-all overflow-hidden cursor-pointer z-10
                                                        ${sprint.status === 'Active' ? 'bg-indigo-600 border-indigo-700 text-white font-bold ring-4 ring-indigo-500/10' : 'bg-slate-100 border-slate-200 text-slate-700'}
                                                    `}
                                                    style={{ left: sprintStyle.left, width: sprintStyle.width, minWidth: '60px' }}
                                                >
                                                    <span className="text-[11px] truncate uppercase tracking-tighter">{sprint.name}</span>
                                                </div>
                                           )}
                                        </div>
                                        {isExpanded && sprintTasks.map(task => {
                                            const start = task.created_at || sprint.start_date;
                                            const end = task.due_date || sprint.end_date;
                                            const taskStyle = getBarStyles(start, end, 3);
                                            return (
                                                <div key={task.id} className="h-[38px] flex items-center relative group hover:bg-slate-50/50 transition-colors">
                                                    {taskStyle.display !== 'none' && (
                                                        <div 
                                                            className={`absolute h-6 rounded-md border flex items-center shadow-xs overflow-hidden hover:scale-[1.01] transition-transform cursor-pointer group/bar
                                                                ${getPriorityColor(task.priority, task.status)}
                                                            `}
                                                            style={{ left: taskStyle.left, width: taskStyle.width, minWidth: '40px' }}
                                                            title={`${task.title} - ${task.status} (${task.priority})`}
                                                        >
                                                            <div className="flex items-center px-2 space-x-2 truncate">
                                                                {task.status === 'Done' ? <CheckCircle2 className="w-2.5 h-2.5" /> : task.priority === 'Urgent' ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                                                {parseFloat(taskStyle.width) > 8 && (
                                                                    <span className="text-[10px] font-bold truncate">
                                                                        {task.project_name && <span className="opacity-50 font-medium mr-1">{task.project_name}:</span>}{task.title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center space-x-8">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-md bg-rose-500 shadow-sm shadow-rose-200"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urgent</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-md bg-amber-500 shadow-sm shadow-amber-200"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">High</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-md bg-blue-500 shadow-sm shadow-blue-200"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medium</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-md bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Done</span>
                </div>
                <div className="h-4 w-[1px] bg-slate-300 mx-2"></div>
                <div className="flex items-center space-x-2">
                    <div className="w-4 h-[2px] bg-rose-500 opacity-60"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Today</span>
                </div>
            </div>
        </div>
    );
};

export default RoadmapTimeline;
