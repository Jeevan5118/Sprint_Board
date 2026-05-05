import { useMemo, useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    DndContext,
    useDroppable,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCorners
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Layers } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import TaskCard from '../components/sprint/TaskCard';
import TaskDrawer from '../components/sprint/TaskDrawer';
import TaskModal from '../components/sprint/TaskModal';
import BoardControls from '../components/sprint/BoardControls';
import BoardSettingsModal from '../components/sprint/BoardSettingsModal';
import { getColumnStatus, resolveBoardConfig, taskMatchesFilter } from '../utils/boardStyles';

const DroppableColumn = ({ column, tasks, swimlaneMode, onTaskClick, onDeleteTask, boardConfig }) => {
    const statusValue = getColumnStatus(column);
    const { isOver, setNodeRef } = useDroppable({
        id: `column-${column.column_key}`,
        data: { statusValue, type: 'column', columnKey: column.column_key }
    });
    const statusRule = boardConfig?.color_rule_map?.status?.[statusValue];
    const isNearLimit = column.wip_limit && tasks.length >= column.wip_limit - 1;
    const isOverLimit = column.wip_limit && tasks.length >= column.wip_limit;

    const grouped = useMemo(() => {
        if (swimlaneMode === 'none') return [{ key: 'all', label: '', tasks }];
        const groups = {};
        tasks.forEach((task) => {
            let key = 'Unassigned';
            if (swimlaneMode === 'assignee') key = task.assignee_name || 'Unassigned';
            if (swimlaneMode === 'priority') key = task.priority || 'Unknown';
            if (swimlaneMode === 'type') key = task.type || 'Task';
            if (!groups[key]) groups[key] = [];
            groups[key].push(task);
        });
        return Object.entries(groups).map(([key, groupedTasks]) => ({ key, label: key, tasks: groupedTasks }));
    }, [tasks, swimlaneMode]);

    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-slate-100/50 border border-slate-200 rounded-xl">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center rounded-t-xl" style={{ backgroundColor: statusRule?.bg_color || 'rgba(248,250,252,0.8)' }}>
                <h3 className="font-medium" style={{ color: statusRule?.text_color || '#334155' }}>{column.display_name}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm border ${isOverLimit ? 'bg-red-50 border-red-200 text-red-600' : isNearLimit ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {tasks.length}{column.wip_limit ? ` / ${column.wip_limit}` : ''}
                </span>
            </div>
            <div ref={setNodeRef} className={`flex-1 p-3 overflow-y-auto transition-colors ${isOver ? 'bg-primary-blue/5 border-primary-blue/20' : ''}`}>
                {grouped.map((group) => (
                    <div key={group.key} className="mb-3">
                        {swimlaneMode !== 'none' && (
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{group.label}</div>
                        )}
                        {group.tasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} onDelete={onDeleteTask} boardConfig={boardConfig} />)}
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400">
                        Drop sprint tasks
                    </div>
                )}
            </div>
        </div>
    );
};

const SprintBoard = ({ isPowerHour = false }) => {
    const { teamId } = useParams();
    const { search } = useLocation();
    const queryParams = new URLSearchParams(search);
    const urlSprintId = queryParams.get('sprintId');

    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeSprint, setActiveSprint] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
    const [boardConfig, setBoardConfig] = useState(resolveBoardConfig(null, 'sprint'));
    const [filterState, setFilterState] = useState({
        search: '',
        type: '',
        priority: '',
        assignee_id: '',
        swimlane_mode: 'none',
    });
    const canManage = user?.role === 'Admin' || user?.role === 'Team Lead';

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const buildFilterPayload = () => {
        const payload = {};
        if (filterState.search) payload.search = filterState.search;
        if (filterState.type) payload.types = [filterState.type];
        if (filterState.priority) payload.priorities = [filterState.priority];
        if (filterState.assignee_id) payload.assignee_ids = [filterState.assignee_id];
        return payload;
    };

    const fetchSprintData = async () => {
        try {
            setLoading(true);
            // 1. Fetch initialization data (Active Sprint, Members, Board Config) in ONE call
            const url = `/teams/${teamId}/board-init?is_power_hour=${isPowerHour}${urlSprintId ? `&sprint_id=${urlSprintId}` : ''}`;
            const { data: initData } = await api.get(url);

            const sprint = initData.sprint;
            setActiveSprint(sprint);
            setMembers(initData.members || []);

            const cfg = resolveBoardConfig(initData.boardConfig, 'sprint');
            setBoardConfig(cfg);
            if (cfg.settings.swimlane_mode) {
                setFilterState((prev) => ({ ...prev, swimlane_mode: cfg.settings.swimlane_mode }));
            }

            // 2. Fetch tasks for the sprint if it exists
            if (sprint) {
                const taskRes = await api.get(`/teams/${teamId}/tasks?sprint_id=${sprint.id}&is_power_hour=${isPowerHour}&filter_json=${encodeURIComponent(JSON.stringify(buildFilterPayload()))}`);
                setTasks(taskRes.data);
            } else {
                setTasks([]);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Failed to load Sprint data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSprintData(); }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!activeSprint) return;
        const timeout = setTimeout(() => fetchSprintData(), 250);
        return () => clearTimeout(timeout);
    }, [filterState.search, filterState.type, filterState.priority, filterState.assignee_id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleTaskSaved = (savedTask, isEdit) => {
        if (isEdit) {
            setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
            toast.success('Task updated');
        } else {
            setTasks(prev => [...prev, savedTask]);
            toast.success('Task created');
        }
        setEditingTask(null);
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setShowTaskModal(true);
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const taskId = active.id.toString().replace('task-', '');
        const sourceStatus = active.data.current?.status;
        const destStatus = over.data.current?.statusValue || over.data.current?.status;
        if (!destStatus || sourceStatus === destStatus) return;

        const destColumn = boardConfig.columns.find((c) => getColumnStatus(c) === destStatus);
        const destTasks = tasks.filter((t) => t.status === destStatus);
        if (destColumn?.wip_limit && destTasks.length >= destColumn.wip_limit) {
            toast.error(`WIP limit (${destColumn.wip_limit}) reached for ${destColumn.display_name}`);
            return;
        }

        if (destStatus === 'Done' && user?.role === 'Member' && !isPowerHour) {
            toast.error('Only Admins or Team Leads can mark tasks as Done. Please move to "In Review" first.');
            return;
        }

        const isMemberProposing = user?.role === 'Member' && !isPowerHour;
        const updatePayload = {
            status: destStatus,
            sort_order: Date.now(),
            sprint_id: activeSprint.id
        };

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? {
            ...t,
            status: isMemberProposing ? t.status : destStatus,
            pending_status: isMemberProposing ? destStatus : null
        } : t));

        try {
            await api.put(`/teams/${teamId}/tasks/${taskId}/status`, updatePayload);
            toast.success(isMemberProposing ? 'Status change requested' : 'Task moved');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to move task');
            setTasks(prev => prev.map(t => t.id === taskId ? {
                ...t,
                status: sourceStatus,
                pending_status: null
            } : t));
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await api.delete(`/teams/${teamId}/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success('Task deleted');
        } catch {
            toast.error('Failed to delete task');
        }
    };

    const handleCompleteSprint = async () => {
        if (!activeSprint || !window.confirm(`Complete "${activeSprint.name}"?`)) return;
        try {
            await api.put(`/teams/${teamId}/sprints/${activeSprint.id}/complete`);
            toast.success('Sprint completed!');
            setActiveSprint(null);
            setTasks([]);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to complete sprint');
        }
    };

    const getSprintDurationMeta = (sprint) => {
        if (!sprint?.start_date || !sprint?.end_date) {
            return {
                hasDates: false,
                totalDays: 0,
                elapsedDays: 0,
                remainingDays: 0,
                progressPercent: 0,
                progressLabel: 'Schedule not set',
                rangeLabel: 'Unscheduled',
                durationLabel: 'No duration',
            };
        }

        const now = new Date();
        const start = new Date(sprint.start_date);
        const end = new Date(sprint.end_date);
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const dayMs = 1000 * 60 * 60 * 24;
        const totalDays = Math.max(Math.floor((endDay - startDay) / dayMs) + 1, 1);
        const elapsedDays = Math.min(Math.max(Math.floor((todayDay - startDay) / dayMs) + 1, 0), totalDays);
        const remainingDays = Math.max(Math.floor((endDay - todayDay) / dayMs), 0);
        const progressPercent = Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100);

        let progressLabel = `${remainingDays} day${remainingDays === 1 ? '' : 's'} left`;
        if (todayDay < startDay) progressLabel = 'Sprint not started yet';
        if (todayDay.getTime() === endDay.getTime()) progressLabel = 'Ends today';
        if (todayDay > endDay) progressLabel = `Overdue by ${Math.floor((todayDay - endDay) / dayMs)} day(s)`;

        return {
            hasDates: true,
            totalDays,
            elapsedDays,
            remainingDays,
            progressPercent,
            progressLabel,
            rangeLabel: `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
            durationLabel: `${totalDays} day sprint`,
        };
    };

    const displayedTasks = useMemo(() => {
        const localFilter = {
            search: filterState.search,
            types: filterState.type ? [filterState.type] : [],
            priorities: filterState.priority ? [filterState.priority] : [],
            assignee_ids: filterState.assignee_id ? [filterState.assignee_id] : [],
        };
        return tasks.filter((task) => taskMatchesFilter(task, localFilter));
    }, [tasks, filterState]);
    const sprintDuration = useMemo(() => getSprintDurationMeta(activeSprint), [activeSprint]);

    const handleQuickFilterPick = (filter) => {
        if (!filter) {
            setActiveQuickFilterId(null);
            return;
        }
        const parsed = filter.filter_json || {};
        setActiveQuickFilterId(filter.id);
        setFilterState((prev) => ({
            ...prev,
            type: parsed.types?.[0] || '',
            priority: parsed.priorities?.[0] || '',
            assignee_id: parsed.assignee_ids?.[0] || '',
            search: parsed.search || '',
        }));
    };

    const qs = `?board_type=sprint&is_power_hour=${isPowerHour}`;
    const refreshConfigOnly = async () => {
        const res = await api.get(`/teams/${teamId}/board-settings${qs}`);
        setBoardConfig(resolveBoardConfig(res.data, 'sprint'));
    };
    const saveSettings = async (payload) => {
        await api.put(`/teams/${teamId}/board-settings${qs}`, payload);
        await fetchSprintData();
        toast.success('Board settings saved');
    };
    const saveColumns = async (columns) => {
        await api.put(`/teams/${teamId}/board-settings/columns${qs}`, { columns });
        await fetchSprintData();
        toast.success('Board columns saved');
    };
    const saveColors = async (color_rules) => {
        await api.put(`/teams/${teamId}/board-settings/colors${qs}`, { color_rules });
        await refreshConfigOnly();
        toast.success('Color rules saved');
    };
    const saveTransitions = async (transition_rules) => {
        await api.put(`/teams/${teamId}/board-settings/transitions${qs}`, { transition_rules });
        await refreshConfigOnly();
        toast.success('Transition rules saved');
    };
    const createQuickFilter = async (payload) => {
        await api.post(`/teams/${teamId}/board-settings/quick-filters${qs}`, payload);
        await refreshConfigOnly();
        toast.success('Quick filter created');
    };
    const updateQuickFilter = async (id, payload) => {
        await api.put(`/teams/${teamId}/board-settings/quick-filters/${id}${qs}`, payload);
        await refreshConfigOnly();
    };
    const deleteQuickFilter = async (id) => {
        await api.delete(`/teams/${teamId}/board-settings/quick-filters/${id}${qs}`);
        await refreshConfigOnly();
        toast.success('Quick filter deleted');
    };

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary-blue animate-spin"></div></div>;

    if (!activeSprint) return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Sprint</h2>
            <p>Start a sprint from the Sprints page to see the board.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">{activeSprint.name} Board</h1>
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Live Now
                        </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                            <span className="text-slate-300">Duration</span>
                            <span className="text-slate-600">{sprintDuration.rangeLabel}</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary-blue bg-primary-blue/5 px-2 py-0.5 rounded-md border border-primary-blue/10">{sprintDuration.progressLabel}</span>
                        </div>
                    </div>
                    {sprintDuration.hasDates && (
                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <span>{sprintDuration.durationLabel}</span>
                                <span>{sprintDuration.elapsedDays}/{sprintDuration.totalDays} days elapsed</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all duration-700 ${sprintDuration.progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary-blue'}`}
                                    style={{ width: `${sprintDuration.progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex space-x-2">
                    {canManage && (
                        <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="btn-primary">+ Create Task</button>
                    )}
                    {canManage && (
                        <button onClick={handleCompleteSprint} className="btn-secondary text-green-700 border-green-300 hover:bg-green-50">Complete Sprint</button>
                    )}
                </div>
            </div>

            <BoardControls
                boardConfig={boardConfig}
                members={members}
                filterState={filterState}
                onFilterChange={(patch) => setFilterState((prev) => ({ ...prev, ...patch }))}
                activeQuickFilterId={activeQuickFilterId}
                onQuickFilterPick={handleQuickFilterPick}
                onOpenSettings={() => setShowSettingsModal(true)}
                canManage={canManage}
            />

            <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                <Layers className="w-4 h-4" />
                {boardConfig.columns.map((c) => {
                    const status = getColumnStatus(c);
                    const rule = boardConfig.color_rule_map?.status?.[status];
                    return (
                        <span key={c.column_key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border" style={{ backgroundColor: rule?.bg_color, color: rule?.text_color, borderColor: rule?.border_color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: rule?.badge_color }} />
                            {c.display_name}
                        </span>
                    );
                })}
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex space-x-6 h-[calc(100vh-20rem)]">
                        {boardConfig.columns.map((col) => (
                            <DroppableColumn
                                key={col.column_key}
                                column={col}
                                tasks={displayedTasks.filter((t) => (t.pending_status || t.status) === getColumnStatus(col))}
                                swimlaneMode={filterState.swimlane_mode}
                                onTaskClick={handleTaskClick}
                                onDeleteTask={canManage ? handleDeleteTask : null}
                                boardConfig={boardConfig}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <TaskCard
                                task={tasks.find(t => `task-${t.id}` === activeId)}
                                isOverlay
                                boardConfig={boardConfig}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <TaskDrawer isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} onEdit={canManage ? handleEditTask : null} boardConfig={boardConfig} />
            {selectedTask && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={() => setSelectedTask(null)} />}

            <TaskModal
                isOpen={showTaskModal}
                onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
                onSaved={handleTaskSaved}
                teamId={teamId}
                sprintId={activeSprint?.id}
                editTask={editingTask}
                isPowerHour={isPowerHour}
                boardConfig={boardConfig}
            />

            <BoardSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                boardType="sprint"
                boardConfig={boardConfig}
                onSaveSettings={saveSettings}
                onSaveColumns={saveColumns}
                onSaveColors={saveColors}
                onSaveTransitions={saveTransitions}
                onCreateQuickFilter={createQuickFilter}
                onUpdateQuickFilter={updateQuickFilter}
                onDeleteQuickFilter={deleteQuickFilter}
            />
        </div>
    );
};

export default SprintBoard;
