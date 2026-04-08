import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
import { Search, Filter, X, ChevronDown, User } from 'lucide-react';
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

const SprintBoard = ({ isPowerHour = false }) => {
    const { teamId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [activeSprint, setActiveSprint] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [activeId, setActiveId] = useState(null);

    // Filtering State
    const [filteredUserId, setFilteredUserId] = useState(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    const canManage = user?.role === 'Admin' || user?.role === 'Team Lead';

    // Handle initial filter from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const userId = params.get('userId');
        if (userId) setFilteredUserId(userId);
    }, [location.search]);

    // Handle outside clicks for dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSprintData = async () => {
        try {
            const [sprintRes, membersRes] = await Promise.all([
                api.get(`/teams/${teamId}/sprints?is_power_hour=${isPowerHour}`),
                api.get(`/teams/${teamId}/members`)
            ]);

            setTeamMembers(membersRes.data);
            const active = sprintRes.data.find(s => s.status === 'Active');
            if (active) {
                setActiveSprint(active);
                const taskRes = await api.get(`/teams/${teamId}/tasks?sprint_id=${active.id}&is_power_hour=${isPowerHour}`);
                setTasks(taskRes.data);
            }
        } catch {
            toast.error('Failed to load Sprint data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSprintData(); }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Restriction: Only Admin/Team Lead can move to 'Done'
        if (destStatus === 'Done' && user?.role === 'Member') {
            toast.error('Only Admins or Team Leads can mark tasks as Done. Please move to "In Review" first.');
            return;
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: destStatus } : t));
        try {
            await api.put(`/teams/${teamId}/tasks/${taskId}/status`, {
                status: destStatus,
                sort_order: Date.now(),
                sprint_id: activeSprint.id
            });
            toast.success('Task moved');
        } catch {
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

    const getDaysRemaining = (endDate) => {
        if (!endDate) return null;
        const diff = new Date(endDate) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return 'Sprint Overdue';
        if (days === 0) return 'Ends Today';
        if (days === 1) return 'Ends Tomorrow';
        return `${days} Days Remaining`;
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

    const filteredTasks = filteredUserId
        ? tasks.filter(t => t.assignee_id === filteredUserId)
        : tasks;

    const filteredMembers = teamMembers.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedMember = teamMembers.find(m => m.id === filteredUserId);

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
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
                                <span className="text-slate-300">DURATION</span>
                                <span className="text-slate-600">{new Date(activeSprint.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} — {new Date(activeSprint.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="w-px h-3 bg-slate-200"></div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-primary-blue bg-primary-blue/5 px-2 py-0.5 rounded-md border border-primary-blue/10">{getDaysRemaining(activeSprint.end_date)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Member Filter Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${filteredUserId ? 'bg-primary-blue/5 border-primary-blue text-primary-blue' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                                <Filter className="w-4 h-4" />
                                {selectedMember ? `Member: ${selectedMember.name}` : 'Filter by Member'}
                                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <div className="p-2 border-b border-slate-100">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search members..."
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-primary-blue outline-none"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto py-1">
                                        <button
                                            onClick={() => {
                                                setFilteredUserId(null);
                                                setIsFilterOpen(false);
                                                navigate(location.pathname);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${!filteredUserId ? 'text-primary-blue font-bold bg-blue-50/50' : 'text-slate-600'}`}
                                        >
                                            <Users className="w-4 h-4" /> All Members
                                        </button>
                                        <div className="h-px bg-slate-50 my-1"></div>
                                        {filteredMembers.map(member => (
                                            <button
                                                key={member.id}
                                                onClick={() => {
                                                    setFilteredUserId(member.id);
                                                    setIsFilterOpen(false);
                                                    navigate(`${location.pathname}?userId=${member.id}`);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-3 hover:bg-slate-50 ${filteredUserId === member.id ? 'text-primary-blue font-bold bg-blue-50/50' : 'text-slate-600'}`}
                                            >
                                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                                    {member.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate">{member.name || 'Unknown User'}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {filteredMembers.length === 0 && (
                                            <p className="px-4 py-6 text-center text-xs text-slate-400">No members found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {filteredUserId && (
                            <button
                                onClick={() => {
                                    setFilteredUserId(null);
                                    navigate(location.pathname);
                                }}
                                className="p-2 text-slate-400 hover:text-danger-red hover:bg-rose-50 rounded-lg transition-colors"
                                title="Clear Filter"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex space-x-2">
                            {canManage && (
                                <button onClick={() => { setEditingTask(null); setShowTaskModal(true); }} className="btn-primary tracking-tight font-black uppercase text-xs italic">+ Create Task</button>
                            )}
                            {canManage && (
                                <button onClick={handleCompleteSprint} className="btn-secondary text-green-700 border-green-300 hover:bg-green-50 tracking-tight font-black uppercase text-xs italic">Complete Sprint</button>
                            )}
                        </div>
                    </div>
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
                            <DroppableColumn key={col} id={col} tasks={filteredTasks.filter(t => t.status === col)} onTaskClick={handleTaskClick} onDeleteTask={canManage ? handleDeleteTask : null} />
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
                isPowerHour={isPowerHour}
            />
        </div>
    );
};

export default SprintBoard;
