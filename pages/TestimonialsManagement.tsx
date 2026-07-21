// pages/TestimonialsManagement.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/Toast';
import { Testimonial } from '../types';
import { Star, PlusCircle, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, User, Quote } from 'lucide-react';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

interface TestimonialsManagementProps {
  testimonials: Testimonial[];
  onAddTestimonial: (payload: Omit<Testimonial, 'id' | 'created_at'>) => Promise<void>;
  onUpdateTestimonialStatus: (id: string, status: Testimonial['status']) => Promise<void>;
  onDeleteTestimonial: (id: string) => Promise<void>;
}

export default function TestimonialsManagement({
  testimonials,
  onAddTestimonial,
  onUpdateTestimonialStatus,
  onDeleteTestimonial
}: TestimonialsManagementProps) {
  const toast = useToast();
  const [activeFilter, setActiveFilter] = useState<'All' | Testimonial['status']>('All');
  
  // Testimonial Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_name: '',
    company: '',
    rating: 5,
    review_text: '',
    status: 'Pending' as Testimonial['status']
  });

  const filteredTestimonials = testimonials.filter(
    t => activeFilter === 'All' || t.status === activeFilter
  );

  const handleOpenModal = () => {
    setFormData({
      client_name: '',
      company: '',
      rating: 5,
      review_text: '',
      status: 'Approved'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.review_text) {
      toast.add({
        title: 'Validation Error',
        message: 'Please complete all required fields.',
        type: 'error'
      });
      return;
    }

    try {
      await onAddTestimonial(formData);
      toast.add({
        title: 'Success!',
        message: 'Testimonial added successfully.',
        type: 'success'
      });
      setIsModalOpen(false);
    } catch (e: any) {
      toast.add({
        title: 'Action Failed',
        message: e.message || 'Error occurred saving review.',
        type: 'error'
      });
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      try {
        await onDeleteTestimonial(deleteId);
        toast.add({
          title: 'Testimonial Deleted',
          message: 'The review was removed from the list.',
          type: 'success'
        });
      } catch (e: any) {
        toast.add({
          title: 'Delete Failed',
          message: e.message || 'Error deleting review.',
          type: 'error'
        });
      } finally {
        setDeleteId(null);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: Testimonial['status']) => {
    try {
      await onUpdateTestimonialStatus(id, newStatus);
      toast.add({
        title: 'Status Updated',
        message: `Review status set to ${newStatus.toUpperCase()}.`,
        type: 'success'
      });
    } catch (e: any) {
      toast.add({
        title: 'Status Change Failed',
        message: e.message || 'Error updating review state.',
        type: 'error'
      });
    }
  };

  // Helper to render rating stars
  const renderStars = (rating: number, interactive: boolean = false, onClick?: (stars: number) => void) => {
    const starArray = [1, 2, 3, 4, 5];
    return (
      <div className="flex gap-0.5 items-center">
        {starArray.map(star => {
          const filled = star <= rating;
          return (
            <Star
              key={star}
              onClick={() => interactive && onClick && onClick(star)}
              className={`h-4.5 w-4.5 ${interactive ? 'cursor-pointer' : ''} ${
                filled ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
              }`}
            />
          );
        })}
      </div>
    );
  };

  const getStatusBadge = (status: Testimonial['status']) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'Pending':
        return 'bg-amber-100 text-amber-700 border border-amber-200';
      case 'Rejected':
        return 'bg-rose-100 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Quote className="h-6 w-6 text-indigo-600 rotate-180" />
            Client Testimonials Board
          </h1>
          <p className="text-sm text-slate-500 mt-1">Moderate client reviews, star ratings, and success quotes. Approved testimonials display on the public website frontpage.</p>
        </div>
        <Button
          onClick={handleOpenModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 self-start md:self-auto flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Custom Testimonial
        </Button>
      </div>

      {/* Tabs Filter Block */}
      <div className="flex border rounded-lg p-1 bg-slate-100 gap-1 self-start">
        {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(tab => {
          const count = tab === 'All'
            ? testimonials.length
            : testimonials.filter(t => t.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === tab
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40'
              }`}
            >
              {tab}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeFilter === tab ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reviews Cards Grid */}
      {filteredTestimonials.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border rounded-2xl bg-white shadow-sm">
          <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-600">No Testimonials Found</p>
          <p className="text-xs text-slate-500 mt-1">There are no client reviews matching this filter currently.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTestimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-0 shadow-md bg-white overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-shadow relative">
              {/* Status Header Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm border ${getStatusBadge(testimonial.status)}`}>
                  {testimonial.status}
                </span>
              </div>

              {/* Review Quote Body */}
              <CardContent className="p-5 pt-8 flex-1 space-y-4">
                <div className="flex justify-between items-center shrink-0">
                  {renderStars(testimonial.rating)}
                </div>
                <div className="relative">
                  <Quote className="h-8 w-8 text-slate-100 absolute -top-4 -left-2 rotate-180 -z-0" />
                  <p className="text-slate-600 font-semibold text-xs leading-relaxed z-10 relative pl-4">
                    "{testimonial.review_text}"
                  </p>
                </div>
              </CardContent>

              {/* User Identity Header */}
              <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{testimonial.client_name}</p>
                    {testimonial.company && (
                      <p className="text-[10px] text-slate-400 font-bold">{testimonial.company}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Moderator Action Buttons */}
              <CardFooter className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  {testimonial.status !== 'Approved' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(testimonial.id, 'Approved')}
                      className="h-8 text-xs text-emerald-600 hover:bg-emerald-50 font-bold flex items-center gap-1 px-2.5"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  )}
                  {testimonial.status !== 'Rejected' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange(testimonial.id, 'Rejected')}
                      className="h-8 text-xs text-rose-500 hover:bg-rose-50 font-semibold flex items-center gap-1 px-2.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(testimonial.id)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete Review"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Custom Testimonial Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Customer Review / Testimonial"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Client Name *</label>
              <Input
                type="text"
                required
                placeholder="e.g. Johnathan Doe"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Company / Designation</label>
              <Input
                type="text"
                placeholder="e.g. CTO, Acme Corp"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Stars Rating *</label>
              <div className="flex items-center gap-2">
                {renderStars(formData.rating, true, (stars) => setFormData({ ...formData, rating: stars }))}
                <span className="text-xs font-bold text-slate-500">({formData.rating} / 5 Stars)</span>
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Testimonial Quote / Review Text *</label>
              <textarea
                required
                rows={5}
                placeholder="Paste the customer feedback text..."
                value={formData.review_text}
                onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                className="w-full text-xs p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-bold text-slate-700 block">Initial Status</label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Testimonial['status'] })}
                className="text-xs h-9 bg-white"
              >
                <option value="Approved">Approved (Live)</option>
                <option value="Pending">Pending Review</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs h-9 px-3 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs font-bold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add Testimonial
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Testimonial"
        description="Are you sure you want to permanently delete this testimonial? This action cannot be undone."
      />
    </div>
  );
}
