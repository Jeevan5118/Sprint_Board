import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import TaskCard from '../components/sprint/TaskCard';
import TaskDrawer from '../components/sprint/TaskDrawer';
import TaskModal from '../components/sprint/TaskModal';

const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'];

const DroppableColumn = ({ id, tasks, onTaskClick, onDeleteTask }) => {
    const { isOver, setNodeRef } = useDroppable({
        id,
        data: { status: id }
    });
    return (
        <div className="flex flex-col flex-shrink-0 w-80 bg-slate-100/50 border border-slate-200 rounded-xl">
            <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 rounded-t-xl">
                <h3 className="font-medium text-slate-700">{id}</h3>
                <span className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-600 shadow-sm">
                    {tasks.length}
                </span>
            </div>
            <div ref={setNodeRef} className={`flex-1 p-3 overflow-y-auto transition-colors ${isOver ? 'bg-primary-blue/5 border-primary-blue/20' : ''}`}>
                {tasks.map(t => <TaskCard key={t.id} task={t} onClick={onTaskClick} onDelete={onDeleteTask} />)}
                {tasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400">
                        Drop sprint tasks
                    </div>
                )}
            </div>
        </div>
    );
};

const SprintBoard = () => {
    const { teamId } = useParams();
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [activeSprint, setActiveSprint] = useState(null);
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

    const fetchSprintData = async () => {
        try {
            const sprintRes = await api.get(`/teams/${teamId}/sprints`);
            const active = sprintRes.data.find(s => s.status === 'Active');
            if (active) {
                setActiveSprint(active);
                const taskRes = await api.get(`/teams/${teamId}/tasks?sprint_id=${active.id}`);
                setTasks(taskRes.data);
            }
        } catch (error) {
            toast.error('Failed to load Sprint data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSprintData(); }, [teamId]);

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

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: destStatus } : t));
        try {
            await api.put(`/teams/${teamId}/tasks/${taskId}/status`, {
                status: destStatus,
                sort_order: Date.now(),
                sprint_id: activeSprint.id
            });
            toast.success('Task moved');
        } catch (error) {
            toast.error('Failed to move task');
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{activeSprint.name} Board</h1>
                    <p className="text-sm text-slate-500 mt-1">Ends {new Date(activeSprint.end_date).toLocaleDateString()}</p>
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

            <div className="flex-1 overflow-x-auto pb-4">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex space-x-6 h-[calc(100vh-14rem)]">
                        {COLUMNS.map(col => (
                            <DroppableColumn key={col} id={col} tasks={tasks.filter(t => t.status === col)} onTaskClick={handleTaskClick} onDeleteTask={canManage ? handleDeleteTask : null} />
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
                sprintId={activeSprint?.id}
                editTask={editingTask}
            />
        </div>
    );
};

export default SprintBoard;
