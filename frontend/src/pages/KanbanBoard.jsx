import { useMemo, useState, useEffect } from 'react';
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
import TaskCard from '../components/sprint/TaskCard';
import TaskDrawer from '../components/sprint/TaskDrawer';
import TaskModal from '../components/sprint/TaskModal';
import BoardControls from '../components/sprint/BoardControls';
import BoardSettingsModal from '../components/sprint/BoardSettingsModal';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { getColumnStatus, resolveBoardConfig, taskMatchesFilter } from '../utils/boardStyles';

const DroppableColumn = ({ column, tasks, swimlaneMode, onTaskClick, onDeleteTask, boardConfig }) => {
    const statusValue = getColumnStatus(column);
    const { isOver, setNodeRef } = useDroppable({
        id: `column-${column.column_key}`,
        data: { statusValue, type: 'column', columnKey: column.column_key }
    });
    const isNearLimit = column.wip_limit && tasks.length >= column.wip_limit - 1;
    const isOverLimit = column.wip_limit && tasks.length >= column.wip_limit;
    const statusRule = boardConfig?.color_rule_map?.status?.[statusValue];

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
            <div
                className="p-3 border-b border-slate-200 flex justify-between items-center rounded-t-xl"
                style={{ backgroundColor: statusRule?.bg_color || 'rgba(248,250,252,0.8)' }}
            >
                <h3 className="font-medium" style={{ color: statusRule?.text_color || '#334155' }}>{column.display_name}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm border ${isOverLimit ? 'bg-red-50 border-red-200 text-red-600' : isNearLimit ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {tasks.length}{column.wip_limit ? ` / ${column.wip_limit}` : ''}
                </span>
            </div>
            <div ref={setNodeRef} className={`flex-1 p-3 overflow-y-auto transition-colors ${isOver ? 'bg-primary-blue/5' : ''} ${isOverLimit ? 'bg-danger-red/5' : ''}`}>
                {grouped.map((group) => (
                    <div key={group.key} className="mb-3">
                        {swimlaneMode !== 'none' && (
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{group.label}</div>
                        )}
                        {group.tasks.map((t) => <TaskCard key={t.id} task={t} onClick={onTaskClick} onDelete={onDeleteTask} boardConfig={boardConfig} />)}
                    </div>
                ))}
                {tasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400">Drop tasks here</div>
                )}
            </div>
        </div>
    );
};

const KanbanBoard = ({ isPowerHour = false }) => {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [boardConfig, setBoardConfig] = useState(resolveBoardConfig(null, 'kanban'));
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [activeQuickFilterId, setActiveQuickFilterId] = useState(null);
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

    const buildQuery = () => {
        const payload = {};
        if (filterState.search) payload.search = filterState.search;
        if (filterState.type) payload.types = [filterState.type];
        if (filterState.priority) payload.priorities = [filterState.priority];
        if (filterState.assignee_id) payload.assignee_ids = [filterState.assignee_id];
        return payload;
    };

    const fetchBoard = async () => {
        try {
            const filterPayload = buildQuery();
            const { data } = await api.get(`/teams/${teamId}/tasks/kanban?is_power_hour=${isPowerHour}&filter_json=${encodeURIComponent(JSON.stringify(filterPayload))}`);
            setTasks(data.tasks || []);
            setBoardConfig(resolveBoardConfig(data.board_config, 'kanban'));
            if (data.board_config?.settings?.swimlane_mode) {
                setFilterState((prev) => ({ ...prev, swimlane_mode: data.board_config.settings.swimlane_mode }));
            }
            const membersRes = await api.get(`/teams/${teamId}/members${isPowerHour ? '?is_power_hour=true' : ''}`);
            setMembers(membersRes.data || []);
        } catch {
            toast.error('Failed to load Kanban Board');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoard();
    }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchBoard();
        }, 250);
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
        const destTasks = tasks.filter(t => t.status === destStatus);
        if (destColumn?.wip_limit && destTasks.length >= destColumn.wip_limit) {
            toast.error(`WIP limit (${destColumn.wip_limit}) reached for ${destColumn.display_name}`);
            return;
        }

        if (destStatus === 'Done' && user?.role === 'Member') {
            toast.error('Only Admins or Team Leads can mark tasks as Done. Please move to "In Review" first.');
            return;
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: destStatus } : t));
        try {
            await api.put(`/teams/${teamId}/tasks/${taskId}/status`, { status: destStatus, sort_order: Date.now() });
            toast.success('Task updated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to move task');
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: sourceStatus } : t));
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            await api.delete(`/teams/${teamId}/tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success('Task deleted');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete task');
        }
    };

    const displayedTasks = useMemo(() => {
        const localFilter = {
            search: filterState.search,
            types: filterState.type ? [filterState.type] : [],
            priorities: filterState.priority ? [filterState.priority] : [],
            assignee_ids: filterState.assignee_id ? [filterState.assignee_id] : [],
        };
        return tasks.filter((t) => taskMatchesFilter(t, localFilter));
    }, [tasks, filterState]);

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

    const qs = `?board_type=kanban&is_power_hour=${isPowerHour}`;
    const refreshConfigOnly = async () => {
        const res = await api.get(`/teams/${teamId}/board-settings${qs}`);
        setBoardConfig(resolveBoardConfig(res.data, 'kanban'));
    };

    const saveSettings = async (payload) => {
        await api.put(`/teams/${teamId}/board-settings${qs}`, payload);
        await fetchBoard();
        toast.success('Board settings saved');
    };
    const saveColumns = async (columns) => {
        await api.put(`/teams/${teamId}/board-settings/columns${qs}`, { columns });
        await fetchBoard();
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

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{isPowerHour ? 'Power Hour Kanban' : 'Kanban Board'}</h1>
                    <p className="text-sm text-slate-500 mt-1">{isPowerHour ? 'Manage backlog tasks across all members.' : 'Manage backlog tasks outside of active sprints.'}</p>
                </div>
                {canManage && (
                    <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="btn-primary">+ Create Task</button>
                )}
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
                    <div className="flex space-x-6 h-[calc(100vh-18rem)]">
                        {boardConfig.columns.map((col) => {
                            const statusValue = getColumnStatus(col);
                            const colTasks = displayedTasks.filter((t) => t.status === statusValue);
                            return (
                                <DroppableColumn
                                    key={col.column_key}
                                    column={col}
                                    tasks={colTasks}
                                    swimlaneMode={filterState.swimlane_mode}
                                    onTaskClick={setSelectedTask}
                                    onDeleteTask={canManage ? handleDeleteTask : null}
                                    boardConfig={boardConfig}
                                />
                            );
                        })}
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
                sprintId={null}
                editTask={editingTask}
                isPowerHour={isPowerHour}
                boardConfig={boardConfig}
            />

            <BoardSettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                boardType="kanban"
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

export default KanbanBoard;
