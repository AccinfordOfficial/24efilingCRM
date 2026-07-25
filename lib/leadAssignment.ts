import { supabase } from './supabaseClient';

export interface AssignmentRule {
    id: string;
    name: string;
    priority: number;
    is_active: boolean;
    rule_type: 'round_robin' | 'skill_based' | 'load_balanced' | 'source_based' | 'geography_based';
    conditions: {
        source?: string;
        city?: string;
        service?: string;
    };
    target_branch_id?: string;
    target_user_ids?: string[];
    last_assigned_index?: number;
}

export async function autoAssignLead(leadData: {
    source?: string;
    city?: string;
    service_requested?: string;
    branch_id?: string;
}): Promise<string | null> {
    try {
        const { data: rules, error } = await supabase
            .from('lead_assignment_rules')
            .select('*')
            .eq('is_active', true)
            .order('priority', { ascending: false });

        if (error || !rules || rules.length === 0) {
            return null;
        }

        for (const rule of (rules as unknown) as AssignmentRule[]) {

            const cond = rule.conditions || {};
            
            // Check condition match
            if (cond.source && cond.source !== leadData.source) continue;
            if (cond.city && cond.city !== leadData.city) continue;
            if (cond.service && cond.service !== leadData.service_requested) continue;

            // Match found! Process assignment strategy
            if (rule.rule_type === 'round_robin' && rule.target_user_ids && rule.target_user_ids.length > 0) {
                const currentIndex = (rule.last_assigned_index || 0) % rule.target_user_ids.length;
                const assignedUserId = rule.target_user_ids[currentIndex];
                const nextIndex = (currentIndex + 1) % rule.target_user_ids.length;

                // Update last assigned index
                await (supabase.from('lead_assignment_rules') as any)
                    .update({ last_assigned_index: nextIndex })
                    .eq('id', rule.id);

                return assignedUserId;
            }

            if (rule.rule_type === 'load_balanced') {
                const targetBranch = rule.target_branch_id || leadData.branch_id;
                let query = supabase.from('profiles').select('id, role, branch_id').eq('status', 'Active');
                if (targetBranch) {
                    query = query.eq('branch_id', targetBranch);
                }
                const { data: users } = await query;

                if (users && users.length > 0) {
                    const userIds = users.map(u => u.id);
                    const { data: leadCounts } = await supabase
                        .from('leads')
                        .select('assigned_to')
                        .in('assigned_to', userIds)
                        .not('status', 'in', '("Converted","Closed Lost")');

                    const countMap: Record<string, number> = {};
                    userIds.forEach(id => countMap[id] = 0);
                    leadCounts?.forEach((l: any) => {
                        if (l.assigned_to) countMap[l.assigned_to] = (countMap[l.assigned_to] || 0) + 1;
                    });

                    const sorted = userIds.sort((a, b) => (countMap[a] || 0) - (countMap[b] || 0));
                    return sorted[0];
                }
            }
        }
    } catch (err) {
        console.error("Error in autoAssignLead:", err);
    }
    return null;
}
