import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Task } from '../../types';

export function useTasksApi(core: {
    profile: any;
    fetchData: () => Promise<void>;
    addActivityToLead: (leadId: string, activityData: any, user: any) => Promise<void>;
}) {
    const { profile, fetchData, addActivityToLead } = core;

    const addTaskToLead = useCallback(async (leadId: string | null, taskData: Omit<Task, 'id' | 'created_at' | 'is_completed' | 'completed_at'>) => {
        if (!profile) throw new Error("User not authenticated");
        const { error } = await (supabase.from('tasks' as any) as any).insert([{
            lead_id: leadId || null,
            content: taskData.content,
            due_date: taskData.due_date,
            created_by: profile.id,
            branch_id: taskData.branch_id || profile.branch_id || null,
            is_completed: false,
            priority: taskData.priority,
            depends_on_task_id: (taskData as any).depends_on_task_id,
            assigned_to: taskData.assigned_to?.id || (taskData.assigned_to as any) || null,
            status: taskData.status || 'todo',
            category: taskData.category || 'client_task',
            estimated_hours: taskData.estimated_hours || null,
            actual_hours: taskData.actual_hours || null
        }]);
        if (error) throw error;

        if (leadId) {
            try {
                const formattedDate = taskData.due_date 
                    ? new Date(taskData.due_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'No date specified';
                await addActivityToLead(leadId, {
                    type: 'Note',
                    content: `Scheduled a task: "${taskData.content}" due on ${formattedDate}.`
                }, profile);
            } catch (e) {
                console.error("Failed to log task activity", e);
            }
        }

        await fetchData();
    }, [profile, addActivityToLead, fetchData]);

    const updateTaskOnLead = useCallback(async (leadId: string | null, updatedTask: Task) => {
        if (!profile) throw new Error("User not authenticated");
        const { id, content, due_date, is_completed, completed_at, priority } = updatedTask;
        const dbUpdates = { 
            content, 
            due_date, 
            is_completed, 
            completed_at, 
            priority,
            assigned_to: updatedTask.assigned_to?.id || (updatedTask.assigned_to as any) || null,
            status: updatedTask.status || 'todo',
            category: updatedTask.category || 'client_task',
            estimated_hours: updatedTask.estimated_hours || null,
            actual_hours: updatedTask.actual_hours || null,
            branch_id: updatedTask.branch_id || null
        };
        const { error } = await (supabase.from('tasks' as any) as any).update(dbUpdates).eq('id', id);
        if (error) throw error;

        if (is_completed && leadId) {
            try {
                await addActivityToLead(leadId, {
                    type: 'Note',
                    content: `Completed the task: "${content}".`
                }, profile);
            } catch (e) {
                console.error("Failed to log task completion activity", e);
            }
        }

        await fetchData();
    }, [profile, addActivityToLead, fetchData]);

    const deleteTaskFromLead = useCallback(async (leadId: string | null, taskId: string) => {
        const { error } = await (supabase.from('tasks' as any) as any).delete().eq('id', taskId);
        if (error) throw error;
        await fetchData();
    }, [fetchData]);

    return {
        addTaskToLead,
        updateTaskOnLead,
        deleteTaskFromLead
    };
}
