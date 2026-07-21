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
                    <div className="mb-4 p-4 border rounded-lg bg-slate-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-3">
                            <Input
                                placeholder="Task description..."
                                value={newTaskContent}
                                onChange={(e) => setNewTaskContent(e.target.value)}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Input
                                    type="datetime-local"
                                    value={newTaskDueDate}
                                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                                    className="w-auto"
                                />
                                <Select
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                    className="w-32"
                                >
                                    {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                                <div className="flex-1"></div>
                                <Button variant="ghost" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddTask}>Add Task</Button>
                            </div>
                        </div>
                    </div>
                )}

                {isLoadingDetails && <div className="text-center py-4 text-slate-500">Loading tasks...</div>}
                {!isLoadingDetails && tasks?.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">No tasks scheduled.</p>
                )}

                <div className="space-y-2">
                    {tasks && tasks.length > 0 ? (
                        <div className="overflow-x-auto border border-slate-250/60 rounded-xl mt-2">
                            <table className="min-w-full divide-y divide-slate-250/60 text-left">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th scope="col" className="w-16 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Task Description</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date & Time</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                                        <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created By</th>
                                        <th scope="col" className="w-16 px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {tasks.map((task) => {
                                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_completed;
                                        const priorityBadgeColor = 
                                            task.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                            task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-blue-50 text-blue-700 border-blue-200';
                                        return (
                                            <tr 
                                                key={task.id}
                                                className={`group transition-all duration-200 ${task.is_completed ? 'bg-slate-50/40' : 'hover:bg-slate-50/20'} ${completedTaskId === task.id ? 'bg-green-50/60' : ''} ${animatedTaskId === task.id ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleToggleTask(task)}
                                                        className={`transition-colors duration-300 ${task.is_completed ? 'text-green-500 hover:text-green-600' : 'text-slate-300 hover:text-slate-400'} ${completedTaskId === task.id ? 'scale-125' : ''}`}
                                                    >
                                                        <CheckCircleIcon className={`h-5 w-5 ${task.is_completed ? 'fill-current' : ''}`} />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                    <span className={task.is_completed ? 'text-slate-400 line-through font-normal' : 'text-slate-800'}>
                                                        {task.content}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                                    {task.due_date ? (
                                                        <span className={isOverdue ? 'text-red-600 font-bold flex items-center gap-1.5' : 'text-slate-600 font-medium'}>
                                                            {task.due_date.includes('T') 
                                                                ? new Date(task.due_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                                : new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            }
                                                            {isOverdue && <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200">Overdue</span>}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No date set</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                                                    <span className={`px-2.5 py-0.5 rounded-full border ${priorityBadgeColor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
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
