import React from 'react';
import { cn } from '../../lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverEffect = true,
  glow = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 transition-all duration-300",
        hoverEffect && "glass-card-hover",
        glow && "neon-glow-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
