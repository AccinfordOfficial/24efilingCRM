// pages/BlogsManagement.tsx
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/Toast';
import { Blog } from '../types';
import { supabase } from '../lib/supabaseClient';
import { 
  PlusCircle, Search, Edit, Trash2, Globe, FileText, 
  User, Clock, Eye, AlertCircle, Loader2 
} from 'lucide-react';

interface BlogsManagementProps {
  blogs: Blog[];
  onAddBlog: (payload: Omit<Blog, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateBlog: (id: string, updates: Partial<Blog>) => Promise<void>;
  onDeleteBlog: (id: string) => Promise<void>;
}

export default function BlogsManagement({
  blogs,
  onAddBlog,
  onUpdateBlog,
  onDeleteBlog
}: BlogsManagementProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Blog Edit / Create Modal State
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  
  // Dual Image options state
  const [imageSource, setImageSource] = useState<'url' | 'upload'>('url');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    author: '',
    category: 'GST Registrations',
    status: 'Draft' as Blog['status'],
    read_time: 5,
    image_url: ''
  });

  const categories = ['GST Registrations', 'Startup Registrations', 'Tax Filings', 'General'];

  const filteredBlogs = blogs
    .filter(blog => selectedCategory === 'All' || blog.category === selectedCategory)
    .filter(blog => {
      const query = searchQuery.toLowerCase();
      return (
        blog.title.toLowerCase().includes(query) ||
        blog.content.toLowerCase().includes(query) ||
        blog.author.toLowerCase().includes(query)
      );
    });

  const handleOpenCreateModal = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      author: 'Sekhar Anthati',
      category: 'GST Registrations',
      status: 'Draft',
      read_time: 5,
      image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500'
    });
    setImageSource('url');
    setIsBlogModalOpen(true);
  };

  const handleOpenEditModal = (blog: Blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      author: blog.author,
      category: blog.category,
      status: blog.status,
      read_time: blog.read_time,
      image_url: blog.image_url || ''
    });
    
    // Smart detection: default to upload tab if url contains supabase documents
    if (blog.image_url && blog.image_url.includes('supabase')) {
      setImageSource('upload');
    } else {
      setImageSource('url');
    }
    
    setIsBlogModalOpen(true);
  };

  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      toast.add({
        title: 'Invalid File Type',
        message: 'Please choose an image file (PNG, JPG, JPEG, or WebP).',
        type: 'error'
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `blog-images/blog-${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.add({
        title: 'Upload Successful',
        message: 'Local image uploaded successfully to cloud storage.',
        type: 'success'
      });
    } catch (err: any) {
      toast.add({
        title: 'Upload Failed',
        message: err.message || 'An error occurred during file upload.',
        type: 'error'
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.author) {
      toast.add({
        title: 'Validation Error',
        message: 'Please complete all required fields.',
        type: 'error'
      });
      return;
    }

    const slugified = formData.slug || formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const payload = {
      ...formData,
      slug: slugified
    };

    try {
      if (editingBlog) {
        await onUpdateBlog(editingBlog.id, payload);
        toast.add({
          title: 'Success!',
          message: 'Blog article updated successfully.',
          type: 'success'
        });
      } else {
        await onAddBlog(payload);
        toast.add({
          title: 'Success!',
          message: 'New blog article created and queued.',
          type: 'success'
        });
      }
      setIsBlogModalOpen(false);
    } catch (e: any) {
      toast.add({
        title: 'Action Failed',
        message: e.message || 'Error occurred saving article.',
        type: 'error'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this blog post?")) return;
    try {
      await onDeleteBlog(id);
      toast.add({
        title: 'Blog Post Deleted',
        message: 'The article was removed from the list.',
        type: 'success'
      });
    } catch (e: any) {
      toast.add({
        title: 'Delete Failed',
        message: e.message || 'Error deleting article.',
        type: 'error'
      });
    }
  };

  const toggleBlogStatus = async (blog: Blog) => {
    const newStatus: Blog['status'] = blog.status === 'Published' ? 'Draft' : 'Published';
    try {
      await onUpdateBlog(blog.id, { status: newStatus });
      toast.add({
        title: 'Status Updated',
        message: `Article has been toggled to ${newStatus.toUpperCase()}.`,
        type: 'success'
      });
    } catch (e: any) {
      toast.add({
        title: 'Status Update Failed',
        message: e.message || 'Error updating status.',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto text-white">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            <FileText className="h-6 w-6 text-indigo-400" />
            Website Blogs & Content Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">Compose educational resources, startup insights, and company updates to publish directly to the main website.</p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="bg-primary hover:bg-primary/90 text-white font-bold h-10 px-4 self-start md:self-auto flex items-center gap-2 border border-white/10 shadow-lg"
        >
          <PlusCircle className="h-4 w-4" />
          Write New Article
        </Button>
      </div>

      {/* Filters & Search Block */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex gap-2 items-center overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedCategory === 'All'
                ? 'bg-primary border-primary/50 text-white shadow-md'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Categories
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-primary border-primary/50 text-white shadow-md'
                  : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-900/80 text-white w-full border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder-slate-500"
          />
        </div>
      </div>

      {/* Blogs Grid */}
      {filteredBlogs.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-white/10 rounded-2xl bg-slate-900/80 backdrop-blur-md shadow-xl">
          <AlertCircle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="font-bold text-white">No Articles Found</p>
          <p className="text-xs text-slate-400 mt-1">There are no articles listed under this category yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBlogs.map((blog) => (
            <Card key={blog.id} className="border border-white/10 shadow-xl bg-slate-900/80 backdrop-blur-md text-white overflow-hidden flex flex-col group hover:border-white/20 transition-all">
              {/* Card Image */}
              <div className="h-44 relative bg-slate-950 overflow-hidden shrink-0">
                <img
                  src={blog.image_url || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500'}
                  alt={blog.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                />
                <span className="absolute top-3 left-3 text-[10px] font-extrabold bg-slate-900/90 backdrop-blur-sm text-white border border-white/10 px-2.5 py-0.5 rounded-full shadow-sm">
                  {blog.category}
                </span>
                <button
                  type="button"
                  onClick={() => toggleBlogStatus(blog)}
                  className={`absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm cursor-pointer border ${
                    blog.status === 'Published'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Click to toggle status"
                >
                  {blog.status}
                </button>
              </div>

              {/* Card Content */}
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-white text-sm md:text-base line-clamp-2 leading-tight min-h-[2.5rem]">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {blog.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate max-w-[80px] font-semibold">{blog.author}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{blog.read_time} min read</span>
                  </div>
                </div>
              </CardContent>

              {/* Card Footer actions */}
              <CardFooter className="bg-slate-950/40 px-4 py-3 border-t border-white/5 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-semibold text-slate-400">
                  Updated: {new Date(blog.updated_at || blog.created_at).toLocaleDateString('en-IN')}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEditModal(blog)}
                    className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(blog.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isBlogModalOpen}
        onClose={() => setIsBlogModalOpen(false)}
        title={editingBlog ? 'Edit Blog Article' : 'Write New Website Article'}
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Article Title *</label>
              <Input
                type="text"
                required
                placeholder="e.g. GST Registration Guidelines for Proprietary Concerns"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Category *</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="text-xs h-9 bg-white"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Status *</label>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Blog['status'] })}
                className="text-xs h-9 bg-white"
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Author Name *</label>
              <Input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Read Time (minutes)</label>
              <Input
                type="number"
                min={1}
                value={formData.read_time}
                onChange={(e) => setFormData({ ...formData, read_time: Number(e.target.value) || 5 })}
                className="text-xs"
              />
            </div>
            
            {/* Visual Image Section with Two Options */}
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Visual Image</label>
              
              {/* Tab Selector */}
              <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 gap-1 w-full sm:w-fit mb-2">
                <button
                  type="button"
                  onClick={() => setImageSource('url')}
                  className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all flex items-center gap-1 ${
                    imageSource === 'url'
                      ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Globe className="h-3 w-3" /> External Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('upload')}
                  className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all flex items-center gap-1.5 ${
                    imageSource === 'upload'
                      ? 'bg-white text-indigo-655 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PlusCircle className="h-3 w-3" /> Local File Upload
                </button>
              </div>

              {/* URL Input */}
              {imageSource === 'url' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Input
                    type="text"
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">Paste any direct global image URL to display as the cover photo.</p>
                </div>
              )}

              {/* Local File Upload Dropzone */}
              {imageSource === 'upload' && (
                <div className="space-y-2.5 animate-fadeIn">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {uploadingImage ? (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-650" />
                      <span className="text-xs font-extrabold text-slate-500">Uploading file to cloud storage...</span>
                    </div>
                  ) : formData.image_url && formData.image_url.includes('supabase') ? (
                    <div className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl bg-slate-50/50 relative group">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200/50 shrink-0">
                        <img src={formData.image_url} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <p className="font-extrabold text-xs text-slate-850 truncate">Uploaded Blog Image</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Supabase Documents Bucket</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 transition-colors shadow-sm"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="h-7 px-2.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[10px] font-extrabold text-red-600 transition-colors shadow-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-28 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-indigo-50/10 cursor-pointer gap-1.5 transition-all group"
                    >
                      <PlusCircle className="h-6 w-6 text-slate-450 group-hover:text-indigo-550 group-hover:scale-105 transition-transform" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-700 group-hover:text-slate-800">Click to choose image file</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">PNG, JPG, JPEG or WebP (max 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Article Content (Markdown supported) *</label>
              <textarea
                required
                rows={6}
                placeholder="Type your article contents here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full text-xs p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBlogModalOpen(false)}
              className="text-xs h-9 px-3 bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-xs font-bold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Article
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
