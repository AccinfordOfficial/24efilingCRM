import React from 'react';
import { User } from '../../types';
import { UserCard } from './UserCard';

interface UserGridProps {
  users: User[];
  onEdit: (user: User) => void;
  onToggleStatus: (user: User, status: boolean) => void;
  onViewActivity: (user: User) => void;
  onTransfer: (user: User) => void;
  currentUserRole?: string;
  currentUser?: User;
}

export const UserGrid: React.FC<UserGridProps> = ({ users, onEdit, onToggleStatus, onViewActivity, onTransfer, currentUserRole, currentUser }) => {
  if (users.length === 0) {
    return (
      <div className="glass-card border border-white/5 p-12 text-center">
        <p className="text-slate-400 font-medium">No users found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onViewActivity={onViewActivity}
          onTransfer={onTransfer}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
};
