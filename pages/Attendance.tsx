import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FormField } from '../components/ui/FormField';
import { FormSelect } from '../components/ui/FormSelect';
import { FormTextarea } from '../components/ui/FormTextarea';
import { Dialog } from '../components/ui/Dialog';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { ClockIcon, CalendarIcon, PlusIcon } from '../components/icons';
import { CheckCircle2 } from 'lucide-react';

interface AttendanceRecord {
    id: string;
    user_id: string;
    date: string;
    check_in: string;
    check_out: string | null;
    status: string;
}

interface LeaveRequestRecord {
    id: string;
    user_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

export const Attendance: React.FC = () => {
    const { profile } = useAuth();
    const { users } = useApi({ fetchOnMount: false });

    const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveType, setLeaveType] = useState('casual');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

    const todayDateStr = new Date().toISOString().split('T')[0];

    const fetchData = async () => {
        try {
            setIsLoading(true);
            // Fetch today's attendance for current user
            const { data: attData } = await supabase
                .from('attendance')
                .select('*')
                .eq('user_id', profile?.id || '')
                .eq('date', todayDateStr)
                .single();

            if (attData) {
                setTodayAttendance(attData as AttendanceRecord);
            }

            // Fetch leave requests
            const { data: leaveData } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });

            setLeaveRequests((leaveData || []) as LeaveRequestRecord[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const now = new Date().toISOString().split('T')[0];
        setStartDate(now);
        setEndDate(now);
    }, [profile?.id]);

    const handleCheckIn = async () => {
        try {
            const nowIso = new Date().toISOString();
            const { data, error } = await (supabase.from('attendance') as any).insert([{
                user_id: profile?.id,
                date: todayDateStr,
                check_in: nowIso,
                status: 'present',
                branch_id: profile?.branch_id
            }]).select().single();

            if (error) throw error;
            setTodayAttendance(data as AttendanceRecord);
            toast.success(`Checked in at ${new Date().toLocaleTimeString()}`);
        } catch (err: any) {
            console.error(err);
            toast.error("Check-in failed");
        }
    };

    const handleCheckOut = async () => {
        if (!todayAttendance) return;
        try {
            const nowIso = new Date().toISOString();
            const { data, error } = await (supabase.from('attendance') as any)
                .update({ check_out: nowIso })
                .eq('id', todayAttendance.id)
                .select().single();

            if (error) throw error;
            setTodayAttendance(data as AttendanceRecord);
            toast.success(`Checked out at ${new Date().toLocaleTimeString()}`);
        } catch (err: any) {
            console.error(err);
            toast.error("Check-out failed");
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            toast.error("Please select start and end dates");
            return;
        }

        try {
            setIsSubmittingLeave(true);
            const { error } = await (supabase.from('leave_requests') as any).insert([{
                user_id: profile?.id,
                leave_type: leaveType,
                start_date: startDate,
                end_date: endDate,
                days: 1,
                reason: reason.trim(),
                status: 'pending'
            }]);

            if (error) throw error;
            toast.success("Leave request submitted for approval");
            setIsLeaveModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to submit leave request");
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Attendance & Leave Management</h2>
                    <p className="text-xs text-slate-400">Daily check-in/out, work-from-home tracking, and leave application workflow.</p>
                </div>
                <Button onClick={() => setIsLeaveModalOpen(true)} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                    <PlusIcon className="h-4 w-4 mr-1" /> Apply for Leave
                </Button>
            </div>

            {/* Check-In Action Widget */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-950 border-white/10 p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400">
                            <ClockIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Today's Shift Tracker</h3>
                            <p className="text-xs text-slate-400">
                                {todayAttendance ? `Checked in at ${new Date(todayAttendance.check_in).toLocaleTimeString()}` : 'You have not checked in yet today.'}
                            </p>
                        </div>
                    </div>

                    <div>
                        {!todayAttendance ? (
                            <Button onClick={handleCheckIn} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 text-sm">
                                Check In Now
                            </Button>
                        ) : !todayAttendance.check_out ? (
                            <Button onClick={handleCheckOut} className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 text-sm">
                                Check Out
                            </Button>
                        ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs px-3 py-1.5">
                                Shift Completed ({new Date(todayAttendance.check_out).toLocaleTimeString()})
                            </Badge>
                        )}
                    </div>
                </div>
            </Card>

            {/* Leave Requests Table */}
            <Card className="bg-slate-900/60 border-white/10">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-blue-400" /> Leave Requests & Approvals
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                    {leaveRequests.length > 0 ? (
                        leaveRequests.map((req) => {
                            const applicant = users.find(u => u.id === req.user_id);
                            return (
                                <div key={req.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-white">{applicant?.name || 'Employee'} • <span className="capitalize">{req.leave_type} Leave</span></p>
                                        <p className="text-xs text-slate-400">{req.start_date} to {req.end_date} • {req.reason || 'No reason provided'}</p>
                                    </div>
                                    <Badge variant="outline" className={
                                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    }>
                                        {req.status.toUpperCase()}
                                    </Badge>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-xs text-slate-500 py-6 text-center">No leave applications filed.</p>
                    )}
                </CardContent>
            </Card>

            {/* Leave Modal */}
            <Dialog isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Apply for Leave">
                <form onSubmit={handleApplyLeave} className="space-y-4">
                    <FormSelect
                        label="Leave Category *"
                        id="leave_cat"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        options={[
                            { value: 'casual', label: 'Casual Leave' },
                            { value: 'sick', label: 'Sick Leave' },
                            { value: 'earned', label: 'Earned Leave' }
                        ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="Start Date *"
                            id="leave_start"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                        <FormField
                            label="End Date *"
                            id="leave_end"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </div>

                    <FormTextarea
                        label="Reason for Leave *"
                        id="leave_reason"
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                        <Button type="button" variant="outline" onClick={() => setIsLeaveModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmittingLeave} className="bg-[#1c398e] hover:bg-[#152c6f] text-white">
                            {isSubmittingLeave ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
};
