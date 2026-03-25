import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';

const TaskCard = ({ task, onClick, onDelete, isOverlay }) => {
    const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({
        id: `task-${task.id}`,
        data: { ...task, type: 'task' }
    });

    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `droppable-task-${task.id}`,
        data: { status: task.status, type: 'task' },
        disabled: isDragging // Can't drop on itself
    });

    const setNodeRef = (node) => {
        setDraggableRef(node);
        setDroppableRef(node);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging && !isOverlay ? 0.3 : 1,
        scale: isOverlay ? 1.05 : 1,
        rotate: isOverlay ? '2deg' : '0deg',
    };

    const priorityColors = {
        Low: 'bg-slate-100 text-slate-800',
        Medium: 'bg-primary-blue/10 text-primary-blue',
        High: 'bg-warning-amber/10 text-warning-amber',
        Urgent: 'bg-danger-red/10 text-danger-red',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick && onClick(task)}
            className={`bg-white p-3 rounded-lg shadow-sm border cursor-grab active:cursor-grabbing mb-3 transition-all ${isDragging ? 'shadow-xl border-primary-blue bg-blue-50/50 scale-[1.02] relative z-50 ring-2 ring-primary-blue/20' :
                isOver ? 'border-primary-blue bg-primary-blue/5 scale-[0.98]' : 'border-slate-200 hover:border-primary-blue'
                }`}
        >
            <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="text-sm font-semibold text-slate-900 leading-tight flex-1">{task.title}</h4>
                <div className="flex items-center gap-1">
                    {task.project_name && (
                        <span className="text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                            {task.project_name}
                        </span>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            className="p-1 text-slate-300 hover:text-danger-red hover:bg-danger-red/5 rounded transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {task.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${priorityColors[task.priority] || priorityColors.Medium}`}>
                    {task.priority}
                </span>

                <div className="flex items-center space-x-2">
                    {task.updated_at && (
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-400 font-medium">
                                {new Date(task.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            {task.last_updated_by_name && (
                                <span className="text-[8px] text-slate-300 font-bold uppercase truncate max-w-[40px]">
                                    {task.last_updated_by_name.split(' ')[0]}
                                </span>
                            )}
                        </div>
                    )}
                    {task.story_points > 0 && (
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                            {task.story_points} PT
                        </span>
                    )}
                    {task.assignee_id && (
                        <div className="flex items-center gap-1.5" title={task.assignee_name}>
                            <div className="w-5 h-5 rounded-full bg-primary-blue text-white flex items-center justify-center text-[10px] font-bold shadow-sm border border-white">
                                {(task.assignee_name || 'A').charAt(0)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default TaskCard;
