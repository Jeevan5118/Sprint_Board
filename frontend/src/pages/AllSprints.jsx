import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Play, CheckCircle, Calendar, LayoutTemplate, ChevronDown, ChevronRight, Activity, Users2 } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const styles = {
        Active: 'bg-blue-50 text-blue-700 border-blue-100',
        Planned: 'bg-slate-100 text-slate-600 border-slate-200',
        Completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.Planned}`}>
            {status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />}
            {status}
        </span>
    );
};

const AllSprints = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState([]);
    const [sprintsByTeam, setSprintsByTeam] = useState({});
    const [expandedTeams, setExpandedTeams] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const canManage = user?.role === 'Admin' || user?.role === 'Team Lead';

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setIsLoading(true);
                const teamsRes = await api.get('/teams');
                const teamsData = teamsRes.data || [];
                setTeams(teamsData);

                // Default expand all teams
                const defaultExpanded = {};
                teamsData.forEach(t => { defaultExpanded[t.id] = true; });
                setExpandedTeams(defaultExpanded);

                // Fetch sprints for each team in parallel
                const sprintResults = await Promise.all(
                    teamsData.map(team =>
                        api.get(`/teams/${team.id}/sprints`)
                            .then(r => ({ teamId: team.id, sprints: r.data || [] }))
                            .catch(() => ({ teamId: team.id, sprints: [] }))
                    )
                );

                const map = {};
                sprintResults.forEach(({ teamId, sprints }) => {
                    map[teamId] = sprints;
                });
                setSprintsByTeam(map);
            } catch {
                toast.error('Failed to load sprints');
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const handleStartSprint = async (teamId, sprintId) => {
        try {
            const { data } = await api.put(`/teams/${teamId}/sprints/${sprintId}/start`);
            setSprintsByTeam(prev => ({
                ...prev,
                [teamId]: prev[teamId].map(s => s.id === sprintId ? data : s)
            }));
            toast.success('Sprint started!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start sprint');
        }
    };

    const handleCompleteSprint = async (teamId, sprintId) => {
        if (!window.confirm('Complete this sprint?')) return;
        try {
            const { data } = await api.put(`/teams/${teamId}/sprints/${sprintId}/complete`);
            setSprintsByTeam(prev => ({
                ...prev,
                [teamId]: prev[teamId].map(s => s.id === sprintId ? data : s)
            }));
            toast.success('Sprint completed!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to complete sprint');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
            </div>
        );
    }

    const totalActive = Object.values(sprintsByTeam).flat().filter(s => s.status === 'Active').length;
    const totalSprints = Object.values(sprintsByTeam).flat().length;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Sprints</h1>
                    <p className="text-sm text-slate-500 mt-1">Team-wise sprint management overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm font-bold">{totalActive} Active</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl">
                        <Users2 className="w-4 h-4" />
                        <span className="text-sm font-bold">{teams.length} Teams · {totalSprints} Sprints</span>
                    </div>
                </div>
            </div>

            {/* Team Sections */}
            <div className="space-y-4">
                {teams.map(team => {
                    const teamSprints = sprintsByTeam[team.id] || [];
                    const isExpanded = expandedTeams[team.id];
                    const activeSprint = teamSprints.find(s => s.status === 'Active');

                    return (
                        <div key={team.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {/* Team Header */}
                            <button
                                onClick={() => toggleTeam(team.id)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary-blue/10 border border-primary-blue/20 flex items-center justify-center text-sm font-black text-primary-blue uppercase">
                                        {team.name?.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-slate-900">{team.name}</p>
                                        <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wide">
                                            {teamSprints.length} sprint{teamSprints.length !== 1 ? 's' : ''}
                                            {activeSprint ? ` · Active: ${activeSprint.name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeSprint && (
                                        <span className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live
                                        </span>
                                    )}
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                </div>
                            </button>

                            {/* Sprints Table */}
                            {isExpanded && (
                                <div className="divide-y divide-slate-100">
                                    {teamSprints.length === 0 ? (
                                        <div className="px-6 py-8 text-center text-sm text-slate-400">
                                            No sprints for this team yet.{' '}
                                            <Link to={`/teams/${team.id}/sprints`} className="text-primary-blue hover:underline font-semibold">
                                                Create one →
                                            </Link>
                                        </div>
                                    ) : (
                                        teamSprints.map(sprint => (
                                            <div key={sprint.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors group">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 truncate">{sprint.name}</p>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-bold mt-0.5">
                                                            <Calendar className="w-3 h-3" />
                                                            {sprint.start_date
                                                                ? `${new Date(sprint.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} → ${sprint.end_date ? new Date(sprint.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'TBD'}`
                                                                : 'Unscheduled'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <StatusBadge status={sprint.status} />
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {sprint.status === 'Planned' && canManage && (
                                                            <button
                                                                onClick={() => handleStartSprint(team.id, sprint.id)}
                                                                className="text-xs font-bold text-primary-blue hover:bg-primary-blue/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <Play className="w-3 h-3" /> Start
                                                            </button>
                                                        )}
                                                        {sprint.status === 'Active' && canManage && (
                                                            <button
                                                                onClick={() => handleCompleteSprint(team.id, sprint.id)}
                                                                className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <CheckCircle className="w-3 h-3" /> Complete
                                                            </button>
                                                        )}
                                                        {(sprint.status === 'Active' || sprint.status === 'Completed') && (
                                                            <Link
                                                                to={`/teams/${team.id}/sprint-board?sprintId=${sprint.id}`}
                                                                className="text-xs font-bold bg-primary-blue text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                            >
                                                                <LayoutTemplate className="w-3 h-3" /> Board
                                                            </Link>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AllSprints;
