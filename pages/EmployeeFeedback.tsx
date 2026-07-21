import React, { useState, useMemo } from 'react';
import { EmployeeFeedback as FeedbackType, User, UserRole, FeedbackRating } from '../types';
import { Star, BarChart3, TrendingUp, User as UserIcon, Calendar, CheckCircle, Clock, AlertCircle, Plus, FileText, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface EmployeeFeedbackProps {
  feedback: FeedbackType[];
  onAddFeedback: (feedbackData: Omit<FeedbackType, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateStatus: (id: string, status: 'draft' | 'submitted' | 'acknowledged') => Promise<any>;
  users: User[];
  branches: any[];
  currentUser: User;
}

export default function EmployeeFeedback({
  feedback = [],
  onAddFeedback,
  onUpdateStatus,
  users = [],
  branches = [],
  currentUser
}: EmployeeFeedbackProps) {
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isBranchManager = currentUser?.role === UserRole.BRANCH_MANAGER;
  const isPrivileged = isSuperAdmin || isAdmin || isBranchManager;

  // Tabs: Performance Board (Manager view) vs My Reviews (Employee view)
  const [activeTab, setActiveTab] = useState<'board' | 'reviews'>(isPrivileged ? 'board' : 'reviews');

  // Modal Dialogs
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  // Form Assessment States
  const [period, setPeriod] = useState('Q3-2026');
  const [feedbackType, setFeedbackType] = useState<'manager' | 'self' | 'peer'>('manager');
  const [comments, setComments] = useState('');
  
  // Star Ratings metrics (1-5 scale)
  const [teamwork, setTeamwork] = useState(3);
  const [communication, setCommunication] = useState(3);
  const [customerHandling, setCustomerHandling] = useState(3);
  const [punctuality, setPunctuality] = useState(3);
  const [initiative, setInitiative] = useState(3);
  const [technical, setTechnical] = useState(3);
  
  const [loading, setLoading] = useState(false);

  // Scoped list
  const managerFeedbackList = useMemo(() => {
    return feedback.map(f => {
      const emp = users.find(u => u.id === f.employee_id);
      const rev = users.find(u => u.id === f.reviewer_id);
      return {
        ...f,
        employee_name: emp ? emp.name : 'Unknown Employee',
        reviewer_name: rev ? rev.name : 'System Reviewer'
      };
    });
  }, [feedback, users]);

  // Employee history reviews
  const myReviews = useMemo(() => {
    return managerFeedbackList.filter(f => f.employee_id === currentUser.id);
  }, [managerFeedbackList, currentUser.id]);

  // Overall Score Calculation
  const computedOverall = useMemo(() => {
    return parseFloat(((teamwork + communication + customerHandling + punctuality + initiative + technical) / 6).toFixed(1));
  }, [teamwork, communication, customerHandling, punctuality, initiative, technical]);

  // Recharts ratings history data
  const ratingsTrendData = useMemo(() => {
    const quarters = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
    return quarters.map(q => {
      const qRev = myReviews.find(r => r.period === q && r.status !== 'draft');
      return {
        name: q,
        score: qRev ? qRev.overall_score : 3.0 // fallback starting baseline
      };
    });
  }, [myReviews]);

  const openFeedbackReview = (user: User) => {
    setSelectedEmployee(user);
    setComments('');
    setTeamwork(3);
    setCommunication(3);
    setCustomerHandling(3);
    setPunctuality(3);
    setInitiative(3);
    setTechnical(3);
    setFeedbackType(user.id === currentUser.id ? 'self' : 'manager');
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const ratings: FeedbackRating = {
        teamwork,
        communication,
        customer_handling: customerHandling,
        punctuality,
        initiative,
        technical
      };

      const payload = {
        employee_id: selectedEmployee.id,
        reviewer_id: currentUser.id,
        feedback_type: feedbackType,
        period,
        ratings,
        overall_score: computedOverall,
        comments,
        is_anonymous: false,
        status: 'submitted' as const
      };

      await onAddFeedback(payload);
      alert('Performance Assessment published successfully!');
      setIsReviewModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save review.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (reviewId: string) => {
    try {
      await onUpdateStatus(reviewId, 'acknowledged');
      alert('Feedback acknowledged successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge review.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Employee Performance Feedback
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Conduct manager assessments, complete self-evaluations, track ratings trends, and build key competencies.
          </p>
        </div>

        {isPrivileged && activeTab === 'board' && (
          <div className="text-xs bg-slate-950/40 p-1.5 rounded-lg border border-white/5 text-slate-400">
            Assessments period active: <strong className="text-blue-400">Q3-2026</strong>
          </div>
        )}
      </div>

      {/* Navigation tab bar */}
      <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4 flex justify-between items-center">
        <div className="flex bg-slate-950/40 p-1 rounded-lg border border-white/5 w-full sm:w-auto">
          {isPrivileged && (
            <button
              onClick={() => setActiveTab('board')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                activeTab === 'board' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Performance Board
            </button>
          )}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
              activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            My Reviews & assessments
          </button>
        </div>
      </Card>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 1. PERFORMANCE BOARD (MANAGER VIEW) */}
        {activeTab === 'board' && isPrivileged && (
          <div className="lg:col-span-3 space-y-6">
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/20 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="py-4 px-6">Employee</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Avg Rating</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {users.map((user) => {
                      const empReviews = managerFeedbackList.filter(f => f.employee_id === user.id && f.period === 'Q3-2026');
                      const managerRev = empReviews.find(r => r.feedback_type === 'manager');
                      const selfRev = empReviews.find(r => r.feedback_type === 'self');

                      return (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-200">{user.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{user.email}</p>
                          </td>
                          <td className="py-4 px-6 text-slate-300 capitalize">
                            {user.role}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
                              <span className="font-bold">{managerRev ? managerRev.overall_score : 'No review'}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold">
                            {managerRev ? (
                              <span className={managerRev.status === 'acknowledged' ? 'text-emerald-400' : 'text-amber-400'}>
                                {managerRev.status === 'acknowledged' ? 'Acknowledged' : 'Awaiting Ack'}
                              </span>
                            ) : (
                              <span className="text-slate-500">Not Assessed</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              onClick={() => openFeedbackReview(user)}
                              className="text-xs bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-200"
                            >
                              Assess Performance
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* 2. MY REVIEWS & ASSESSMENTS (EMPLOYEE VIEW) */}
        {activeTab === 'reviews' && (
          <div className="lg:col-span-3 space-y-6">
            {/* Self-Assessment CTA banner */}
            <Card className="glass-card border-white/5 bg-gradient-to-r from-blue-900/30 via-indigo-900/10 to-transparent backdrop-blur-md p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-200 text-base">Complete your Self-Assessment</h3>
                <p className="text-slate-400 text-xs">Quarterly review deadline: 30 September 2026. Log ratings on teamwork and technical execution.</p>
              </div>
              <Button
                onClick={() => openFeedbackReview(currentUser)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-medium"
              >
                <Plus className="h-4 w-4" /> Start Evaluation
              </Button>
            </Card>

            {/* Score Quarter charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-6 md:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    Overall Performance Trend
                  </h3>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ratingsTrendData}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={[1, 5]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#scoreColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-6 text-center flex flex-col justify-center items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Latest Period Rating</h4>
                <div className="h-20 w-20 rounded-full border-4 border-blue-500/20 bg-blue-500/5 flex items-center justify-center mb-3">
                  <span className="text-2xl font-bold text-slate-200">
                    {myReviews.length > 0 ? myReviews[0].overall_score : 'N/A'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                  Period: {myReviews.length > 0 ? myReviews[0].period : 'Q3-2026'}
                </p>
              </Card>
            </div>

            {/* List of received reviews */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Quarterly Assessment Feed</h3>
              {myReviews.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No performance feedback reviews published.</p>
              ) : (
                myReviews.map((rev) => (
                  <Card key={rev.id} className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-6 space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">Manager Feedback Summary</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Reviewed by: {rev.reviewer_name} • Period: {rev.period}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-slate-200 font-bold bg-slate-950 px-3 py-1 rounded-md border border-white/5 text-xs">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{rev.overall_score} / 5.0</span>
                        </div>

                        {rev.status === 'submitted' ? (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(rev.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1 h-8 flex items-center gap-1"
                          >
                            <Check className="h-4 w-4" /> Acknowledge Review
                          </Button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Acknowledged
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                      {[
                        { label: 'Teamwork', val: rev.ratings.teamwork },
                        { label: 'Communication', val: rev.ratings.communication },
                        { label: 'Cust Handling', val: rev.ratings.customer_handling },
                        { label: 'Punctuality', val: rev.ratings.punctuality },
                        { label: 'Initiative', val: rev.ratings.initiative },
                        { label: 'Technical', val: rev.ratings.technical }
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-950/30 p-2.5 rounded-lg border border-white/5 text-center">
                          <p className="text-[9px] text-slate-500 font-bold uppercase truncate">{item.label}</p>
                          <p className="text-slate-200 font-bold text-sm mt-1">{item.val} / 5</p>
                        </div>
                      ))}
                    </div>

                    {rev.comments && (
                      <div className="bg-slate-950/20 p-3.5 rounded-lg border border-white/5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Assessor Comments</p>
                        <p className="text-slate-300 text-xs leading-relaxed">{rev.comments}</p>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          <Card className="glass-card border-white/5 bg-slate-900/40 backdrop-blur-md p-6 text-xs text-slate-400 space-y-4">
            <h4 className="font-bold text-slate-200 border-b border-white/5 pb-2 uppercase tracking-wider">Review Schedule</h4>
            <div>
              <p className="font-semibold text-slate-300">Self Evaluation deadline:</p>
              <p className="mt-0.5">30 September 2026</p>
            </div>
            <div>
              <p className="font-semibold text-slate-300">Manager review cycle:</p>
              <p className="mt-0.5">01 October - 15 October 2026</p>
            </div>
            <div>
              <p className="font-semibold text-slate-300">Branch Performance reports:</p>
              <p className="mt-0.5">Generates quarterly on closing periods</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-slate-900 border border-white/10 text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              {selectedEmployee?.id === currentUser.id ? 'Self-Assessment Form' : 'Manager Performance Assessment'}
            </DialogTitle>
            {selectedEmployee && (
              <p className="text-xs text-slate-500 mt-1">Assessing: <strong>{selectedEmployee.name}</strong> ({selectedEmployee.role})</p>
            )}
          </DialogHeader>

          <form onSubmit={handleSaveReview} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="Q3-2026">Q3-2026</option>
                  <option value="Q4-2026">Q4-2026</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Average</label>
                <div className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 text-sm font-bold text-center">
                  {computedOverall} / 5.0
                </div>
              </div>
            </div>

            {/* Assessment Sliders */}
            <div className="space-y-3.5 border-t border-white/5 pt-4">
              {[
                { label: 'Teamwork & collaboration', val: teamwork, set: setTeamwork },
                { label: 'Communication skills', val: communication, set: setCommunication },
                { label: 'Customer Handling & satisfaction', val: customerHandling, set: setCustomerHandling },
                { label: 'Punctuality & delivery timelines', val: punctuality, set: setPunctuality },
                { label: 'Initiative & problem solving', val: initiative, set: setInitiative },
                { label: 'Technical capabilities & knowledge', val: technical, set: setTechnical }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{item.label}</span>
                    <span className="text-blue-400">{item.val} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={item.val}
                    onChange={(e) => item.set(Number(e.target.value))}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-4">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assessment Summary & Feedback Comments</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Include specific highlights, achievements, or target metrics for improvements..."
                className="bg-slate-950 border-white/10 text-slate-100 focus:border-blue-500 h-28 resize-none text-xs"
                disabled={loading}
              />
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsReviewModalOpen(false)}
                className="border border-white/10 text-slate-400 hover:text-white"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Evaluation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
