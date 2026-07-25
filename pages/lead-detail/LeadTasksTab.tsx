import React from 'react';
import { Task } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PlusIcon, CheckCircleIcon, EditIcon, Trash2Icon } from '../../components/icons';
import { TASK_PRIORITIES } from '../../constants';

interface LeadTasksTabProps {
    tasks: Task[];
    isTaskDialogOpen: boolean;
    setIsTaskDialogOpen: (open: boolean) => void;
    newTaskContent: string;
    setNewTaskContent: (val: string) => void;
    newTaskDueDate: string;
    setNewTaskDueDate: (val: string) => void;
    newTaskPriority: any;
    setNewTaskPriority: (val: any) => void;
    handleAddTask: () => void;
    isLoadingDetails: boolean;
    completedTaskId: string | null;
    animatedTaskId: string | null;
    handleToggleTask: (task: Task) => void;
    handleEditTaskClick: (task: Task) => void;
    handleDeleteTaskClick: (task: Task) => void;
}

export const LeadTasksTab: React.FC<LeadTasksTabProps> = ({
    tasks,
    isTaskDialogOpen,
    setIsTaskDialogOpen,
    newTaskContent,
    setNewTaskContent,
    newTaskDueDate,
    setNewTaskDueDate,
    newTaskPriority,
    setNewTaskPriority,
    handleAddTask,
    isLoadingDetails,
    completedTaskId,
    animatedTaskId,
    handleToggleTask,
    handleEditTaskClick,
    handleDeleteTaskClick
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks & Agenda</CardTitle>
                <Button size="sm" variant="outline" onClick={() => {
                    setNewTaskContent('');
                    setNewTaskDueDate('');
                    setNewTaskPriority('Medium');
                    setIsTaskDialogOpen(true);
                }}>
                    <PlusIcon className="h-4 w-4 mr-1" /> Add Task
                </Button>
            </CardHeader>
            <CardContent>
                {isTaskDialogOpen && (
                    <div className="mb-4 p-4 border border-slate-200 dark:border-white/10 rounded-lg bg-slate-50 dark:bg-slate-950/40 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-3">
                            <Input
                                placeholder="Task description..."
                                value={newTaskContent}
                                onChange={(e) => setNewTaskContent(e.target.value)}
                                autoFocus
                                className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="datetime-local"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="w-auto bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                />
                                <Select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                    className="w-32 bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10"
                                >
                                    {TASK_PRIORITIES.map(p => <option key={p} value={p} className="bg-slate-950 text-white">{p}</option>)}
                                </Select>
                                <div className="flex-1"></div>
                                <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddTask}>Add Task</Button>
                            </div>
                        </div>
                    </div>
                )}

                {isLoadingDetails && <div className="text-center py-4 text-slate-500 dark:text-slate-400">Loading tasks...</div>}
                {!isLoadingDetails && tasks?.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No tasks scheduled.</p>
                )}

                <div className="space-y-2">
                    {tasks && tasks.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl mt-2">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-white/10 text-left">
                                <thead className="bg-slate-50/50 dark:bg-slate-950/40">
                                    <tr>
                                        <th scope="col" className="w-16 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Status</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Task Description</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due Date & Time</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created By</th>
                                        <th scope="col" className="w-16 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-white/5">
                                    {tasks.map((task) => {
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;
                                        const priorityBadgeColor = 
                                            task.priority === 'High' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                                            task.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                                            'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                                        return (
                                            <tr 
                                                key={task.id}
                                                className={`group transition-all duration-200 ${task.is_completed ? 'bg-slate-50/40 dark:bg-slate-950/20' : 'hover:bg-slate-50/20 dark:hover:bg-white/5'} ${completedTaskId === task.id ? 'bg-green-50/60 dark:bg-green-950/40' : ''} ${animatedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleToggleTask(task)}
                                                        className={`transition-colors duration-300 ${task.is_completed ? 'text-green-500 hover:text-green-600' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'} ${completedTaskId === task.id ? 'scale-125' : ''}`}
                                                    >
                                                        <CheckCircleIcon className={`h-5 w-5 ${task.is_completed ? 'fill-current' : ''}`} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                                                    <span className={task.is_completed ? 'text-slate-400 dark:text-slate-500 line-through font-normal' : 'text-slate-800 dark:text-slate-200'}>
                                                        {task.content}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                    {task.due_date ? (
                                                        <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5' : 'text-slate-600 dark:text-slate-400 font-medium'}>
                                                            {task.due_date.includes('T') 
                                                                ? new Date(task.due_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            }
                                                            {isOverdue && <span className="text-[9px] font-bold uppercase bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">Overdue</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 dark:text-slate-500 italic">No date set</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                                                    <span className={`px-2.5 py-0.5 rounded-full border ${priorityBadgeColor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                                                    {task.created_by?.name || 'Unknown'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
                                                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-lg" onClick={() => handleEditTaskClick(task)}>
                                                            <EditIcon className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg" onClick={() => handleDeleteTaskClick(task)}>
                                                            <Trash2Icon className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
};
