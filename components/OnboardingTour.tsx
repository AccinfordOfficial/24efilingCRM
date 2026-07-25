import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Play, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export interface TourStep {
  path: string;
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const salesExecSteps: TourStep[] = [
  {
    path: '/',
    target: '#tour-sidebar-dashboard',
    title: 'Welcome to 24eFilings CRM',
    content: 'This is your primary command center where you can track active leads, upcoming tasks, and personal performance.',
    placement: 'right'
  },
  {
    path: '/',
    target: '#tour-header-create-lead',
    title: 'Create New Lead',
    content: 'Quickly record new client inquiries, select services, calculate taxes & advance payments, and assign routing.',
    placement: 'bottom'
  },
  {
    path: '/lead-assignments',
    target: '#tour-sidebar-lead-assignments',
    title: 'Head Office Lead Routing',
    content: 'Review incoming leads assigned to Head Office and route them directly to sales executives with one click.',
    placement: 'right'
  },
  {
    path: '/leads',
    target: '#tour-sidebar-leads',
    title: 'Leads & Pipeline Roster',
    content: 'View, filter, and advance leads through workflow stages (Lead Confirmed, Documents & Payments, Success).',
    placement: 'right'
  },
  {
    path: '/services',
    target: '#tour-sidebar-services',
    title: 'Services & Sub-Services Catalog',
    content: 'Access standardized pricing, tax breakdown rules, and sub-service packages for all 24eFilings services.',
    placement: 'right'
  },
  {
    path: '/',
    target: '#tour-header-notifications',
    title: 'Real-Time Notification Hub',
    content: 'Receive instant alerts whenever new leads are assigned to you or require immediate follow-up.',
    placement: 'bottom'
  }
];

const managerAdminSteps: TourStep[] = [
  {
    path: '/',
    target: '#tour-sidebar-dashboard',
    title: 'Executive Operations Dashboard',
    content: 'Monitor real-time revenue analytics, team conversion rates, and branch performance metrics.',
    placement: 'right'
  },
  {
    path: '/users',
    target: '#tour-sidebar-users',
    title: 'User & Team Management',
    content: 'Oversee personnel, edit access roles, inspect user activity logs, and execute inter-branch user transfers.',
    placement: 'right'
  },
  {
    path: '/branch-management',
    target: '#tour-sidebar-branches',
    title: 'Branch & Location Operations',
    content: 'Configure operational branches, city assignments, branch managers, and office contact information.',
    placement: 'right'
  },
  {
    path: '/lead-assignments',
    target: '#tour-sidebar-lead-assignments',
    title: 'Head Office Lead Routing',
    content: 'Inspect unassigned incoming leads and allocate them to sales executives based on capacity.',
    placement: 'right'
  },
  {
    path: '/',
    target: '#tour-header-notifications',
    title: 'System Notifications',
    content: 'Stay updated on critical status changes, new lead assignments, and system-wide announcements.',
    placement: 'bottom'
  }
];

interface OnboardingTourProps {
  currentUserRole?: string;
  forceStart?: boolean;
  onCloseForceStart?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  currentUserRole,
  forceStart = false,
  onCloseForceStart
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isManagement = currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Branch Manager';
  const steps = isManagement ? managerAdminSteps : salesExecSteps;

  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  // Initial check: inspect Supabase Auth user_metadata
  useEffect(() => {
    if (forceStart) {
      setIsActive(true);
      setCurrentStepIndex(0);
      return;
    }

    let isMounted = true;
    const checkTourStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const hasCompleted = user?.user_metadata?.has_completed_tour;

        if (isMounted && !hasCompleted) {
          // Only auto-trigger on the primary dashboard route
          if (location.pathname === '/' || location.pathname === '') {
            const timer = setTimeout(() => {
              if (isMounted) {
                setIsActive(true);
                setCurrentStepIndex(0);
              }
            }, 1200);
            return () => clearTimeout(timer);
          }
        }
      } catch (err) {
        console.warn('Could not fetch tour status from Supabase Auth:', err);
      }
    };

    checkTourStatus();
    return () => { isMounted = false; };
  }, [forceStart, location.pathname]);

  const activeStep = steps[currentStepIndex];

  // Poll for the target element and measure its bounding rectangle
  useEffect(() => {
    if (!isActive || !activeStep) {
      setRect(null);
      return;
    }

    let attempts = 0;
    const findElement = () => {
      const el = document.querySelector(activeStep.target);
      if (el) {
        const elementRect = el.getBoundingClientRect();
        const isOffscreen = 
          elementRect.top < 0 || 
          elementRect.left < 0 || 
          elementRect.bottom > window.innerHeight || 
          elementRect.right > window.innerWidth;
          
        if (isOffscreen && attempts === 0) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setRect(el.getBoundingClientRect());
        clearInterval(pollInterval);
      } else {
        attempts++;
        if (attempts > 30) {
          clearInterval(pollInterval);
          setRect(null);
        }
      }
    };

    const pollInterval = setInterval(findElement, 120);
    findElement();

    window.addEventListener('resize', findElement);
    window.addEventListener('scroll', findElement);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('resize', findElement);
      window.removeEventListener('scroll', findElement);
    };
  }, [isActive, currentStepIndex, activeStep, location.pathname]);

  // Position calculation with collision checks
  useEffect(() => {
    if (!rect || !activeStep) return;

    const spacing = 16;
    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 320;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 180;

    let top = 0;
    let left = 0;

    switch (activeStep.placement) {
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left + rect.width + spacing;
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - spacing;
        break;
      case 'bottom':
        top = rect.top + rect.height + spacing;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'top':
      default:
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
    }

    // Boundary Collisions Checks (keep card inside viewport)
    const margin = 16;
    if (left < margin) left = margin;
    if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - tooltipWidth - margin;
    }
    if (top < margin) top = margin;
    if (top + tooltipHeight > window.innerHeight - margin) {
      top = window.innerHeight - tooltipHeight - margin;
    }

    setTooltipPos({ top, left });
  }, [rect, activeStep]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      const nextStep = steps[nextIndex];
      if (nextStep.path && location.pathname !== nextStep.path) {
        navigate(nextStep.path);
      }
      setCurrentStepIndex(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = steps[prevIndex];
      if (prevStep.path && location.pathname !== prevStep.path) {
        navigate(prevStep.path);
      }
      setCurrentStepIndex(prevIndex);
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    if (onCloseForceStart) onCloseForceStart();
    try {
      // Save tour completion directly to Supabase Auth user_metadata (0 SQL migrations)
      await supabase.auth.updateUser({
        data: { has_completed_tour: true }
      });
    } catch (e) {
      console.warn("Could not save tour completion in Supabase Auth user_metadata:", e);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isActive || !activeStep) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none font-sans select-none">
      {/* Target Element Highlight Box */}
      {rect && (
        <div 
          className="fixed transition-all duration-300 pointer-events-auto shadow-[0_0_0_9999px_rgba(15,23,42,0.75),_0_0_20px_rgba(59,130,246,0.6)] rounded-xl border-2 border-primary z-[9998]"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Fallback backdrop overlay if target is not active/loaded */}
      {!rect && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs pointer-events-auto z-[9998]" />
      )}

      {/* Floating Glassmorphic Tooltip Card */}
      <div 
        ref={tooltipRef}
        className={`fixed bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 dark:border-white/10 rounded-2xl shadow-2xl p-5 w-[300px] sm:w-[340px] pointer-events-auto transition-all duration-200 z-[9999] text-white flex flex-col gap-3 backdrop-blur-md ${
          !rect ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''
        }`}
        style={rect ? {
          top: `${tooltipPos.top}px`,
          left: `${tooltipPos.left}px`,
        } : {}}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <h4 className="text-sm font-bold tracking-tight text-white">{activeStep.title}</h4>
          </div>
          <button 
            onClick={handleSkip} 
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            title="Skip Tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <p className="text-xs text-slate-300 leading-relaxed select-text font-normal">
          {activeStep.content}
        </p>

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
          {/* Step Count */}
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
            Step {currentStepIndex + 1} <span className="text-slate-600">/</span> {steps.length}
          </span>
          
          <div className="flex items-center gap-2">
            {/* Back Button */}
            {currentStepIndex > 0 && (
              <button 
                onClick={handleBack}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}

            {/* Skip Option */}
            {currentStepIndex === 0 && (
              <button 
                onClick={handleSkip}
                className="text-[11px] text-slate-400 hover:text-white transition-colors uppercase font-mono tracking-wider font-semibold mr-1"
              >
                Skip
              </button>
            )}

            {/* Next / Finish Button */}
            <button 
              onClick={handleNext}
              className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-md shadow-primary/20"
            >
              {currentStepIndex === steps.length - 1 ? (
                <>Finish <Play className="h-3 w-3 fill-current ml-0.5" /></>
              ) : (
                <>Next <ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
