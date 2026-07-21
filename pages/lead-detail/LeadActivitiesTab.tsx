import React from 'react';
import { Activity } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FileTextIcon, BriefcaseIcon, FileUpIcon, PhoneIcon, MailIcon } from '../../components/icons';

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const ActivityIcon: React.FC<{ type: Activity['type'] }> = ({ type }) => {
    const iconMap = {
        'Note': FileTextIcon,
        'Status Change': BriefcaseIcon,
        'Document Upload': FileUpIcon,
        'Call': PhoneIcon,
        'Email': MailIcon
    };
    const Icon = iconMap[type] || FileTextIcon;
    return <Icon className="h-4 w-4 text-slate-500" />;
};

interface LeadActivitiesTabProps {
    activities: Activity[];
    newNote: string;
    setNewNote: (val: string) => void;
    onAddNote: () => void;
    isLoadingDetails: boolean;
}

export const LeadActivitiesTab: React.FC<LeadActivitiesTabProps> = ({
    activities,
    newNote,
    setNewNote,
    onAddNote,
    isLoadingDetails
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-6">
                    <Input
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onAddNote()}
                        className="flex-1"
                    />
                    <Button onClick={onAddNote}>Add Note</Button>
                </div>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-8">
                    {isLoadingDetails && <div className="text-center py-4 text-slate-500">Loading history...</div>}

                    {activities?.map((activity) => (
                        <div key={activity.id} className="relative">
                            <div className="absolute -left-[23px] top-1 bg-white border-2 border-slate-200 rounded-full p-1">
                                <ActivityIcon type={activity.type} />
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-medium text-slate-900">
                                        {activity.user?.name || 'Unknown User'}
                                        <span className="font-normal text-slate-600"> {activity.type === 'Note' ? 'added a note' : 'updated the lead'}</span>
                                    </p>
                                    <span className="text-xs text-slate-400">{timeAgo(activity.created_at)}</span>
                                </div>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{activity.content}</p>
                            </div>
                        </div>
                    ))}

                    {!isLoadingDetails && (!activities || activities.length === 0) && (
                        <p className="text-sm text-slate-500 italic ml-2">No activity recorded yet.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
export { timeAgo };
