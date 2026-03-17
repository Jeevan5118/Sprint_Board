import { useState, useEffect } from 'react';
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
import TaskCard from '../components/sprint/TaskCard';
import TaskDrawer from '../components/sprint/TaskDrawer';
import TaskModal from '../components/sprint/TaskModal';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const DroppableColumn = ({ id, tasks, limits, onTaskClick, onDeleteTask }) => {
    const { isOver, setNodeRef } = useDroppable({
        id,
        data: { status: id }
    });
    const isNearLimit = limits[id] && tasks.length >= limits[id] - 1;
    const isOverLimit = limits[id] && tasks.length >= limits[id];
    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-slate-100/50 border border-slate-200 rounded-xl">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
                <h3 className="font-medium text-slate-700">{id}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm border ${isOverLimit ? 'bg-red-50 border-red-200 text-red-600' : isNearLimit ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600'}`}>
                    {tasks.length}{limits[id] ? ` / ${limits[id]}` : ''}
                </span>
            </div>
            <div ref={setNodeRef} className={`flex-1 p-3 overflow-y-auto transition-colors ${isOver ? 'bg-primary-blue/5' : ''} ${isOverLimit ? 'bg-danger-red/5' : ''}`}>
                {tasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} onDelete={onDeleteTask} />)}
                {tasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400">Drop tasks here</div>
                )}
            </div>
        </div>
    );
};

const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

const KanbanBoard = () => {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [limits, setLimits] = useState({});
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [activeId, setActiveId] = useState(null);
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

    useEffect(() => {
        const fetchBoard = async () => {
            try {
                const { data } = await api.get(`/teams/${teamId}/tasks/kanban`);
                setTasks(data.tasks);
                const limMap = {};
                data.limits.forEach(l => limMap[l.status_name] = l.wip_limit);
                setLimits(limMap);
            } catch (error) {
                toast.error('Failed to load Kanban Board');
            } finally {
                setLoading(false);
            }
        };
        fetchBoard();
    }, [teamId]);

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

        // Resolve destination status with higher precision:
        // 1. Check if 'over' is a column (over.id is in COLUMNS)
        // 2. Check if 'over' is a task (extract status from over.data.current)
        let destStatus = null;
        if (COLUMNS.includes(over.id)) {
            destStatus = over.id;
        } else if (over.data.current?.status) {
            destStatus = over.data.current.status;
        }

        // Final validation and move logic
        if (!destStatus || !COLUMNS.includes(destStatus) || sourceStatus === destStatus) return;

        const destTasks = tasks.filter(t => t.status === destStatus);
        if (limits[destStatus] && destTasks.length >= limits[destStatus]) {
            toast.error(`WIP limit (${limits[destStatus]}) reached for ${destStatus}`);
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

    if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-primary-blue animate-spin"></div></div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Kanban Board</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage backlog tasks outside of active sprints.</p>
                </div>
                {canManage && (
                    <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="btn-primary">+ Create Task</button>
                )}
            </div>

            <div className="flex-1 overflow-x-auto pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex space-x-6 h-[calc(100vh-14rem)]">
                        {COLUMNS.map(col => (
                            <DroppableColumn key={col} id={col} tasks={tasks.filter(t => t.status === col)} limits={limits} onTaskClick={setSelectedTask} onDeleteTask={canManage ? handleDeleteTask : null} />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeId ? (
                            <TaskCard
                                task={tasks.find(t => `task-${t.id}` === activeId)}
                                isOverlay
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <TaskDrawer isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} task={selectedTask} onEdit={canManage ? handleEditTask : null} />
            {selectedTask && <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40" onClick={() => setSelectedTask(null)} />}

            <TaskModal
                isOpen={showTaskModal}
                onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
                onSaved={handleTaskSaved}
                teamId={teamId}
                sprintId={null}
                editTask={editingTask}
            />
        </div>
    );
};

export default KanbanBoard;
