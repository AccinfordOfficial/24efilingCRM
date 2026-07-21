import { useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { User } from '../../types';

export function useUsersApi(core: {
    profile: any;
    users: User[];
    fetchData: () => Promise<void>;
    logUserActivity: (action: string, details: string) => Promise<void>;
    logAuditAction: (action: string, entity: string, entityId: string, details: any) => Promise<void>;
}) {
    const { profile, users, fetchData, logUserActivity, logAuditAction } = core;

    const updateUser = useCallback(async (userData: User) => {
        if (!profile) throw new Error("User not authenticated");
        
        const targetId = userData.id;
        const oldUser = users.find(u => u.id === targetId);
        if (!oldUser) throw new Error("User not found");

        const isSelf = targetId === profile.id;
        const currentRole = profile.role;
        const isCurrentAdmin = currentRole === 'Admin' || currentRole === 'Branch Manager';

        const roleChanged = userData.role !== oldUser.role;
        if (roleChanged) {
            if (currentRole !== 'Super Admin') {
                throw new Error("Permission denied: Only Super Admins can assign/change roles.");
            }
            if (isSelf) {
                throw new Error("You cannot change your own role.");
            }
        }

        const branchChanged = userData.branch_id !== oldUser.branch_id;
        const cityChanged = userData.city_id !== oldUser.city_id;
        if (branchChanged || cityChanged) {
            if (isSelf) {
                throw new Error("You cannot transfer yourself to another branch/city.");
            }

            if (currentRole === 'Super Admin') {
                if (oldUser.role === 'Super Admin') {
                    throw new Error("Super Admin cannot transfer other Super Admins.");
                }
            } else if (isCurrentAdmin) {
                if (oldUser.role !== 'Sales Executive') {
                    throw new Error("Permission denied: Branch Managers can only transfer Sales Executives.");
                }
                if (oldUser.branch_id !== profile.branch_id && oldUser.branch_name !== profile.branch_name) {
                    throw new Error("Permission denied: You can only transfer Sales Executives assigned to your own branch.");
                }
            } else {
                throw new Error("Permission denied: You do not have permission to transfer employees.");
            }
        }

        if (!isSelf) {
            if (currentRole === 'Super Admin') {
                if (oldUser.role === 'Super Admin') {
                    throw new Error("Permission denied: Super Admin cannot edit other Super Admins.");
                }
            } else if (isCurrentAdmin) {
                if (oldUser.role !== 'Sales Executive') {
                    throw new Error("Permission denied: You can only manage Sales Executives.");
                }
                if (oldUser.branch_id !== profile.branch_id && oldUser.branch_name !== profile.branch_name) {
                    throw new Error("Permission denied: You can only manage users assigned to your own branch.");
                }
            } else {
                throw new Error("Permission denied: You do not have permission to edit other users.");
            }
        }

        const { id, created_at, last_updated, ...updates } = userData as any;
        const { data, error } = await (supabase.from('profiles') as any).update(updates).eq('id', id).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. Permission denied or user not found.");

        if (branchChanged || cityChanged) {
            const fromCityId = oldUser.city_id;
            const fromBranchId = oldUser.branch_id;
            const toCityId = userData.city_id || oldUser.city_id;
            const toBranchId = userData.branch_id || oldUser.branch_id;
            const toCityName = userData.city_name || oldUser.city_name;
            const toBranchName = userData.branch_name || oldUser.branch_name;
            const transferType = (toCityId !== fromCityId) ? 'City Transfer' : 'Branch Transfer';

            try {
                await (supabase.from('leads') as any).update({
                    branch_id: toBranchId,
                    city_name: toCityName
                }).eq('assigned_to', id);

                await (supabase.from('customers') as any).update({
                    branch_id: toBranchId,
                    city_name: toCityName
                }).eq('assigned_to', id);

                const logEntry = {
                    employee_id: id,
                    from_city_id: fromCityId,
                    from_branch_id: fromBranchId,
                    to_city_id: toCityId,
                    to_branch_id: toBranchId,
                    transferred_by: profile.id,
                    transfer_type: transferType
                };
                await ((supabase as any).from('user_transfer_logs')).insert([logEntry]);

                await logAuditAction('User Transferred', 'User', id, {
                    employee_name: oldUser.name,
                    from_city: oldUser.city_name,
                    from_branch: oldUser.branch_name,
                    to_city: toCityName,
                    to_branch: toBranchName,
                    transfer_type: transferType
                });
            } catch (e) {
                console.error("Failed to process transfer updates/logs:", e);
            }

            await logUserActivity('User Transferred', `Transferred user: ${oldUser.name} to ${toBranchName}`);
        } else {
            await logUserActivity('User Updated', `Updated profile for user: ${userData.name}`);
        }

        if (roleChanged) {
            await logAuditAction('Role Changed', 'User', id, {
                employee_name: oldUser.name,
                old_role: oldUser.role,
                new_role: userData.role
            });
            await logUserActivity('Role Changed', `Changed role for ${oldUser.name} from ${oldUser.role} to ${userData.role}`);
        }

        await fetchData();
    }, [profile, users, fetchData, logUserActivity, logAuditAction]);

    const transferUser = useCallback(async (userId: string, toCityId: string, toCityName: string, toBranchId: string, toBranchName: string) => {
        if (!profile) throw new Error("User not authenticated");
        
        const userToTransfer = users.find(u => u.id === userId);
        if (!userToTransfer) throw new Error("User not found");

        const isSelf = userId === profile.id;
        const currentRole = profile.role;
        const isCurrentAdmin = currentRole === 'Admin' || currentRole === 'Branch Manager';

        if (isSelf) {
            throw new Error("You cannot transfer yourself to another branch/city.");
        }

        if (currentRole === 'Super Admin') {
            if (userToTransfer.role === 'Super Admin') {
                throw new Error("Super Admin cannot transfer other Super Admins.");
            }
        } else if (isCurrentAdmin) {
            if (userToTransfer.role !== 'Sales Executive') {
                throw new Error("Permission denied: Branch Managers can only transfer Sales Executives.");
            }
            if (userToTransfer.branch_id !== profile.branch_id && userToTransfer.branch_name !== profile.branch_name) {
                throw new Error("Permission denied: You can only transfer Sales Executives assigned to your own branch.");
            }
        } else {
            throw new Error("Permission denied: You do not have permission to transfer employees.");
        }

        const fromCityId = userToTransfer.city_id;
        const fromBranchId = userToTransfer.branch_id;
        const transferType = (toCityId !== fromCityId) ? 'City Transfer' : 'Branch Transfer';

        const updates = {
            city_id: toCityId,
            city_name: toCityName,
            branch_id: toBranchId,
            branch_name: toBranchName
        };

        const { data, error } = await (supabase.from('profiles') as any).update(updates).eq('id', userId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Update failed. Permission denied or user not found.");

        try {
            await (supabase.from('leads') as any).update({
                branch_id: toBranchId,
                city_name: toCityName
            }).eq('assigned_to', userId);

            await (supabase.from('customers') as any).update({
                branch_id: toBranchId,
                city_name: toCityName
            }).eq('assigned_to', userId);
        } catch (e) {
            console.error("Failed to update related leads/customers:", e);
        }

        const logEntry = {
            employee_id: userId,
            from_city_id: fromCityId,
            from_branch_id: fromBranchId,
            to_city_id: toCityId,
            to_branch_id: toBranchId,
            transferred_by: profile.id,
            transfer_type: transferType
        };

        try {
            await ((supabase as any).from('user_transfer_logs')).insert([logEntry]);
            await logAuditAction('User Transferred', 'User', userId, {
                employee_name: userToTransfer.name,
                from_city: userToTransfer.city_name,
                from_branch: userToTransfer.branch_name,
                to_city: toCityName,
                to_branch: toBranchName,
                transfer_type: transferType
            });
        } catch (e) {
            console.error("Failed to log transfer:", e);
        }

        await logUserActivity('User Transferred', `Transferred user: ${userToTransfer.name} to ${toBranchName}`);
        await fetchData();
    }, [profile, users, fetchData, logUserActivity, logAuditAction]);

    const deleteMultipleUsers = useCallback(async (userIds: string[]) => {
        if (!profile || (profile.role !== 'Super Admin' && profile.role !== 'Admin')) {
            throw new Error("Only Super Admins and Admins can delete users.");
        }

        try {
            const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userIds }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

        } catch (invokeError: any) {
            console.warn("Standard function invoke failed, attempting local fallback...", invokeError);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No active session");

                const response = await fetch('http://localhost:54321/functions/v1/delete-user', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userIds })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Local function error: ${errorText}`);
                }

                const result = await response.json();
                if (result.error) throw new Error(result.error);

            } catch (fallbackError: any) {
                console.error("Local fallback also failed:", fallbackError);
                console.warn("Attempting direct database deletion...");
                const { error: dbError } = await supabase.from('profiles').delete().in('id', userIds);

                if (dbError) {
                    console.error("Direct deletion failed:", dbError);
                    throw new Error(`Failed to delete users via Function or Direct DB. Please ensuring the 'delete-user' Function is deployed OR run the provided SQL script to enable direct delete permissions. \nEdge Error: ${invokeError.message} \nDB Error: ${dbError.message}`);
                }
                console.log("Direct DB deletion successful.");
            }
        }
        await fetchData();
    }, [profile, fetchData]);

    return {
        updateUser,
        transferUser,
        deleteMultipleUsers
    };
}
