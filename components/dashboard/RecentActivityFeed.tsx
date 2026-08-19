import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { UserActivity, User } from '../../types';
import { timeAgo } from '../../lib/utils';

interface RecentActivityFeedProps {
  activities: UserActivity[];
  users: User[];
  onNavigate: (page: string) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activities, users, onNavigate }) => {
  return (
    <Card className="glass-card border border-white/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-sm font-bold dark:text-white">Recent Activity</CardTitle>
          <CardDescription className="text-xs dark:text-slate-400">Latest updates from your team</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-400 hover:text-primary hover:bg-white/5 h-7"
          onClick={() => onNavigate('Activity Feed')}
        >
          View All
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative pl-5 border-l-2 border-white/10 space-y-5 py-1">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const user = users.find((u) => u.id === activity.user_id);
              return (
                <div key={activity.id} className="relative group">
                  <div className="absolute -left-[25px] bg-slate-800 border-2 border-white/10 w-3.5 h-3.5 rounded-full group-hover:border-primary group-hover:bg-primary/10 transition-colors" />
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                    <p className="text-xs font-medium dark:text-slate-300">
                      <span className="text-primary font-semibold">{user?.name}</span>{' '}
                      {activity.action.toLowerCase().replace('user ', '')}
                      {activity.details && <span className="text-slate-400 font-normal"> — {activity.details}</span>}
                    </p>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500 italic">No recent activity for current filter.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
