




import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { BellIcon, BriefcaseIcon, UserIcon, FileTextIcon, FileUpIcon } from '../components/icons';
import { Notification } from '../types';
import { Button } from '../components/ui/Button';

interface NotificationsProps {
    notifications: Notification[];
    onMarkAllRead: () => void;
    onNavigate: (page: 'Lead Detail' | 'Customer Detail', id: string) => void;
}

const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const iconMap: Record<Notification['type'], React.ElementType> = {
        'Lead Assigned': UserIcon,
        'Status Updated': BriefcaseIcon,
        'Note Added': FileTextIcon,
        'Document Uploaded': FileUpIcon,
        'Payment Completed': BriefcaseIcon,
    };
    const colorMap: Record<Notification['type'], string> = {
        'Lead Assigned': 'text-blue-500',
        'Status Updated': 'text-purple-500',
        'Note Added': 'text-yellow-600',
        'Document Uploaded': 'text-green-500',
        'Payment Completed': 'text-emerald-600',
    };
    const Icon = iconMap[type] || BellIcon;
    const color = colorMap[type] || 'text-slate-500';
    return (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100`}>
            <Icon className={`h-5 w-5 ${color}`} />
        </div>
    );
};

const Notifications: React.FC<NotificationsProps> = ({ notifications, onMarkAllRead, onNavigate }) => {
    useEffect(() => {
        // Mark as read when the page is viewed, after a short delay
        const timeoutId = setTimeout(onMarkAllRead, 1000);
        return () => clearTimeout(timeoutId);
    }, [onMarkAllRead]);
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
                    <p className="text-slate-500 dark:text-slate-400">Stay updated with the latest activities across the CRM.</p>
                </div>
                {notifications.length > 0 && (
                    <Button variant="outline" onClick={onMarkAllRead} disabled={unreadCount === 0} className="dark:bg-slate-900 dark:border-white/10 dark:text-white">
                        Mark all as read
                    </Button>
                )}
            </header>
            <Card className="dark:bg-slate-900/80 dark:border-white/10">
                <CardHeader>
                    <CardTitle className="dark:text-white">Recent Notifications</CardTitle>
                    <CardDescription className="dark:text-slate-400">
                        You have {notifications.length} notifications. {unreadCount > 0 ? `${unreadCount} unread.` : 'All caught up!'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications.length > 0 ? (
                        <ul className="divide-y divide-slate-200 dark:divide-white/10 -mx-6">
                            {notifications.map(notification => (
                                <li
                                    key={notification.id}
                                    className={`py-4 px-6 flex items-start gap-4 transition-colors ${!notification.is_read ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''} ${notification.link ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/5' : ''}`}
                                    onClick={() => notification.link && onNavigate(notification.link.page, notification.link.id)}
                                >
                                    <NotificationIcon type={notification.type} />
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{notification.title}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{notification.message}</p>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                        <p className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{timeAgo(notification.created_at)}</p>
                                        {!notification.is_read && (
                                            <div className="mt-2 h-2 w-2 rounded-full bg-blue-500"></div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <BellIcon className="h-10 w-10 mx-auto text-slate-300" />
                            <h3 className="mt-2 text-lg font-semibold">No notifications yet</h3>
                            <p className="text-sm">When there's new activity, you'll see it here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
export default Notifications;
