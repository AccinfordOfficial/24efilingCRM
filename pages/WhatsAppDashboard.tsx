import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate, Customer, User, Service, UserRole } from '../types';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, Search, Send, RefreshCw, AlertCircle, FileText, CheckCircle2, User as UserIcon, Calendar, ArrowRight, ShieldCheck, Tag, Plus, MessageCircle, MoreVertical } from 'lucide-react';
import { ENV } from '../lib/env';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';

interface WhatsAppDashboardProps {
  conversations: WhatsAppConversation[];
  messages: WhatsAppMessage[];
  templates: WhatsAppTemplate[];
  onSendMessage: (conversationId: string, content: string, templateName?: string) => Promise<any>;
  onAddTemplate: (templateData: Omit<WhatsAppTemplate, 'id' | 'created_at'>) => Promise<any>;
  onSync: () => Promise<void>;
  customers: Customer[];
  users: User[];
  currentUser: User;
  onAddWorkOrder?: (workOrderData: any) => Promise<any>;
  services: Service[];
}

// Pre-seeded mock conversations and template libraries for sandbox testing
const seedConversations: WhatsAppConversation[] = [
  { id: 'c1', customer_phone: '919876543210', customer_name: 'Amit Sharma', customer_id: 'cust-1', last_message_at: new Date(Date.now() - 3600000).toISOString(), unread_count: 2, status: 'active', created_at: new Date().toISOString() },
  { id: 'c2', customer_phone: '919811223344', customer_name: 'Priya Patel', customer_id: 'cust-2', last_message_at: new Date(Date.now() - 86400000).toISOString(), unread_count: 0, status: 'active', created_at: new Date().toISOString() },
  { id: 'c3', customer_phone: '919555667788', customer_name: 'Vijay Kumar', customer_id: null, last_message_at: new Date(Date.now() - 7200000).toISOString(), unread_count: 1, status: 'active', created_at: new Date().toISOString() }
];

const seedMessages: WhatsAppMessage[] = [
  { id: 'm1', conversation_id: 'c1', direction: 'inbound', content: 'Hi, I need assistance registering a new private limited company in Hyderabad. What are the costs involved?', message_type: 'text', status: 'read', is_ai_generated: false, created_at: new Date(Date.now() - 3800000).toISOString() },
  { id: 'm2', conversation_id: 'c1', direction: 'inbound', content: 'Also, can you complete the document verification by tomorrow?', message_type: 'text', status: 'read', is_ai_generated: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  
  { id: 'm3', conversation_id: 'c2', direction: 'outbound', content: 'Hello Priya, your GST return for Q2 has been successfully filed. We have attached the acknowledgment report.', message_type: 'text', status: 'read', is_ai_generated: false, created_at: new Date(Date.now() - 87000000).toISOString() },
  { id: 'm4', conversation_id: 'c2', direction: 'inbound', content: 'Thank you for the quick update! I received the files.', message_type: 'text', status: 'read', is_ai_generated: false, created_at: new Date(Date.now() - 86400000).toISOString() },
  
  { id: 'm5', conversation_id: 'c3', direction: 'inbound', content: 'I want to initiate a work order for income tax filing. Please call me back.', message_type: 'text', status: 'read', is_ai_generated: false, created_at: new Date(Date.now() - 7200000).toISOString() }
];

const seedTemplates: WhatsAppTemplate[] = [
  { id: 't1', name: 'birthday_greetings', content: 'Dear {{1}}, Wish you a very Happy Birthday from all of us at 24eFiling! May this year bring you endless success and prosperity.', variables: ['client_name'], category: 'marketing', status: 'approved', created_at: new Date().toISOString() },
  { id: 't2', name: 'payment_reminder', content: 'Hello {{1}}, this is a friendly reminder that an invoice of Rs. {{2}} is due for your service {{3}}. Please pay here: {{4}}', variables: ['client_name', 'amount', 'service_name', 'payment_link'], category: 'utility', status: 'approved', created_at: new Date().toISOString() },
  { id: 't3', name: 'work_order_created', content: 'Your work order {{1}} for service {{2}} has been successfully initiated. Representative {{3}} is assigned to handle your application.', variables: ['wo_reference', 'service_name', 'rep_name'], category: 'utility', status: 'approved', created_at: new Date().toISOString() }
];

export default function WhatsAppDashboard({
  conversations = [],
  messages = [],
  templates = [],
  onSendMessage,
  onAddTemplate,
  onSync,
  customers = [],
  users = [],
  currentUser,
  onAddWorkOrder,
  services = []
}: WhatsAppDashboardProps) {
  // Merge live database lists with local seeded entries for robust sandbox preview
  const mergedConversations = useMemo(() => {
    const list = [...conversations];
    seedConversations.forEach(sc => {
      if (!list.some(c => c.customer_phone === sc.customer_phone)) {
        list.push(sc);
      }
    });
    return list;
  }, [conversations]);

  const mergedMessages = useMemo(() => {
    const list = [...messages];
    seedMessages.forEach(sm => {
      if (!list.some(m => m.id === sm.id)) {
        list.push(sm);
      }
    });
    return list;
  }, [messages]);

  const mergedTemplates = useMemo(() => {
    const list = [...templates];
    seedTemplates.forEach(st => {
      if (!list.some(t => t.name === st.name)) {
        list.push(st);
      }
    });
    return list;
  }, [templates]);

  // UI Selection States
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Suggested AI responses from Google Gemini
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  // Template Broadcast Dialog
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<string[]>([]);

  // Work Order Creation Drawer
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [woServiceId, setWoServiceId] = useState('');
  const [woDescription, setWoDescription] = useState('');
  const [woAmount, setWoAmount] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiKey = ENV.GOOGLE_GENAI_API_KEY;

  // Active chat stream
  const activeChatMessages = useMemo(() => {
    if (!selectedConv) return [];
    return mergedMessages
      .filter(m => m.conversation_id === selectedConv.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [selectedConv, mergedMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConv) return;

    setLoading(true);
    try {
      await onSendMessage(selectedConv.id, messageInput);
      
      // Auto append if local DB is offline
      const localMsg: WhatsAppMessage = {
        id: Math.random().toString(),
        conversation_id: selectedConv.id,
        direction: 'outbound',
        content: messageInput,
        message_type: 'text',
        status: 'sent',
        is_ai_generated: false,
        created_at: new Date().toISOString()
      };
      mergedMessages.push(localMsg);
      
      setMessageInput('');
      setAiSuggestion('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAISuggestion = async () => {
    if (!selectedConv || !apiKey) {
      setAiSuggestion("AI replies offline. Please check your Gemini API key configurations.");
      return;
    }

    setGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const lastClientMsg = [...activeChatMessages].reverse().find(m => m.direction === 'inbound')?.content || 'No previous messages';

      const prompt = `You are a sales rep for 24efiling CRM. A customer named ${selectedConv.customer_name || 'Client'} sent this WhatsApp message:
      "${lastClientMsg}"
      Suggest a professional, polite, extremely short response (1-2 sentences max). Address their query. Use friendly tone. Do not use placeholders.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      setAiSuggestion(response.text || 'Thank you for contacting us. A sales representative will coordinate your files shortly.');
    } catch (err) {
      console.error(err);
      setAiSuggestion('Thank you for writing. We are reviewing your specifications and will follow up within 24 hours.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Dispatching templates
  const handleOpenTemplateModal = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setTemplateVariables(Array(template.variables.length).fill(''));
    setIsTemplateModalOpen(true);
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate || !selectedConv) return;

    let content = selectedTemplate.content;
    templateVariables.forEach((val, idx) => {
      content = content.replace(`{{${idx + 1}}}`, val || `[Variable ${idx + 1}]`);
    });

    try {
      await onSendMessage(selectedConv.id, content, selectedTemplate.name);
      
      const localMsg: WhatsAppMessage = {
        id: Math.random().toString(),
        conversation_id: selectedConv.id,
        direction: 'outbound',
        content,
        message_type: 'template',
        status: 'sent',
        is_ai_generated: false,
        template_name: selectedTemplate.name,
        created_at: new Date().toISOString()
      };
      mergedMessages.push(localMsg);

      setIsTemplateModalOpen(false);
      alert('Template broadcast dispatched successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed dispatching template.');
    }
  };

  // Convert Chat conversation directly to a Work Order
  const handleCreateWorkOrder = async () => {
    if (!selectedConv || !onAddWorkOrder) return;

    setLoading(true);
    try {
      // Find matching customer id if linked
      let customerLink = selectedConv.customer_id;
      if (!customerLink) {
        // Attempt match by phone
        const matched = customers.find(c => c.phone.replace(/[^0-9]/g, '') === selectedConv.customer_phone.replace(/[^0-9]/g, ''));
        customerLink = matched ? matched.id : null;
      }

      // If customer doesn't exist, log an alert
      if (!customerLink) {
        alert('Please register the client under Customers before creating a Work Order.');
        setLoading(false);
        return;
      }

      const payload = {
        customer_id: customerLink,
        customer_name: selectedConv.customer_name || 'Walk-in Client',
        customer_phone: selectedConv.customer_phone,
        service_id: woServiceId || null,
        description: woDescription || `WhatsApp intake: ${activeChatMessages.filter(m => m.direction === 'inbound').slice(-2).map(m => m.content).join(' | ')}`,
        priority: 'normal',
        status: 'accepted', // Auto accepted
        branch_id: currentUser.branch_id || null,
        total_amount: woAmount ? Number(woAmount) : 0,
        source: 'whatsapp',
        created_by: currentUser.id
      };

      await onAddWorkOrder(payload);
      alert('WhatsApp Bot Intake: Created work order successfully!');
      setIsWorkOrderModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed creating bot-driven work order.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredConvs = useMemo(() => {
    return mergedConversations.filter(c => {
      const search = searchTerm.toLowerCase();
      return (
        (c.customer_name || '').toLowerCase().includes(search) ||
        c.customer_phone.includes(search)
      );
    });
  }, [mergedConversations, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100 h-[85vh] flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            WhatsApp AI Broadcast Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Conduct AI suggestion replies, dispatch pre-approved meta templates, and auto-convert messages to work orders.
          </p>
        </div>

        <Button
          onClick={() => onSync()}
          className="flex items-center gap-2 border border-blue-500/30 bg-blue-950/20 text-blue-400 hover:bg-blue-950/50"
        >
          <RefreshCw className="h-4 w-4" /> Sync Chats
        </Button>
      </div>

      {/* Main split dashboard pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Chats sidebar lists */}
        <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md flex flex-col p-4 gap-4 h-full min-h-0">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 bg-slate-950 border-white/5 text-slate-100 text-xs focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredConvs.map(conv => {
              const active = selectedConv?.id === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex justify-between items-center ${
                    active 
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-100' 
                      : 'bg-slate-950/20 border-white/5 hover:bg-slate-950/40 text-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-xs truncate">{conv.customer_name || 'Walk-in Client'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">+{conv.customer_phone}</p>
                  </div>
                  
                  {conv.unread_count > 0 && (
                    <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-extrabold text-[9px] flex items-center justify-center shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Live Chats panel */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-0 gap-6">
          {selectedConv ? (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Chat Header controls */}
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-950/20 shrink-0">
                <div>
                  <h4 className="font-bold text-sm text-slate-200">{selectedConv.customer_name || 'Walk-in Client'}</h4>
                  <p className="text-[10px] text-slate-500">+{selectedConv.customer_phone}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsWorkOrderModalOpen(true)}
                    className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
                  >
                    <FileText className="h-3.5 w-3.5" /> Bot Work Order
                  </Button>
                </div>
              </div>

              {/* Chat timeline scroll messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10">
                {activeChatMessages.map(msg => {
                  const isOut = msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`flex gap-3 max-w-[70%] ${isOut ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                      <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 text-slate-400 text-xs font-bold font-mono">
                        {isOut ? 'S' : 'C'}
                      </div>
                      
                      <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                        isOut 
                          ? 'bg-blue-600/15 border-blue-500/25 text-blue-100 rounded-tr-none' 
                          : 'bg-slate-900/60 border-white/5 text-slate-200 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[8px] text-slate-500 text-right">{new Date(msg.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* AI suggestion reply tray */}
              {aiSuggestion && (
                <div className="p-3 bg-blue-950/20 border-t border-blue-500/10 flex justify-between items-start gap-4 shrink-0 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-1 text-xs">
                    <span className="font-extrabold text-[9px] bg-blue-600/20 border border-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded uppercase tracking-wider block w-max mb-1.5">
                      Gemini Reply Suggestion
                    </span>
                    <p className="text-slate-300 italic">"{aiSuggestion}"</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setMessageInput(aiSuggestion);
                        setAiSuggestion('');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold h-7 py-1 px-2.5"
                    >
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAiSuggestion('')}
                      className="text-slate-500 hover:text-slate-300 text-[10px] h-7"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Chat sending Form */}
              <form onSubmit={handleSendText} className="p-4 border-t border-white/5 bg-slate-950/20 flex gap-2 shrink-0 items-center">
                <Button
                  type="button"
                  onClick={handleGenerateAISuggestion}
                  disabled={generatingAI}
                  className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 text-blue-400 border border-blue-500/20 shrink-0 text-xs flex items-center gap-1"
                >
                  {generatingAI ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  AI Reply
                </Button>

                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type message here..."
                  className="bg-slate-950 border-white/10 text-slate-100 text-xs focus:border-blue-500 flex-1"
                  disabled={loading}
                />

                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0" disabled={loading}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md flex-1 flex flex-col justify-center items-center text-center p-6">
              <MessageSquare className="h-10 w-10 text-slate-600 mb-2" />
              <h3 className="font-bold text-slate-300 text-sm">No Active conversation selected</h3>
              <p className="text-slate-500 text-xs mt-1">Choose a customer thread from the sidebar to open the chat details.</p>
            </Card>
          )}

          {/* Templates Library panel */}
          {selectedConv && (
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4 shrink-0">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Templates Broadcaster</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {mergedTemplates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleOpenTemplateModal(t)}
                    className="p-3 bg-slate-950/20 hover:bg-slate-950/40 border border-white/5 rounded-lg cursor-pointer transition-colors text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-200 capitalize">{t.name.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{t.category} template</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Template filler variables modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Configure Template Variables
            </DialogTitle>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4 py-2 text-xs">
              <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-slate-400">
                <span className="font-bold block mb-1">Body Preview:</span>
                {selectedTemplate.content}
              </div>

              <div className="space-y-3">
                {selectedTemplate.variables.map((vName, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <label className="font-bold text-slate-400 capitalize">{vName.replace(/_/g, ' ')}</label>
                    <Input
                      value={templateVariables[idx] || ''}
                      onChange={(e) => {
                        const vals = [...templateVariables];
                        vals[idx] = e.target.value;
                        setTemplateVariables(vals);
                      }}
                      placeholder={`Enter variable values...`}
                      className="bg-slate-950 border-white/10 text-slate-100"
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="border border-white/10 text-slate-400">
                  Cancel
                </Button>
                <Button onClick={handleSendTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Send Template
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bot-driven work order creator modal */}
      <Dialog open={isWorkOrderModalOpen} onOpenChange={setIsWorkOrderModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-slate-900 border border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Auto-Accept Work Order Intake
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleCreateWorkOrder(); }} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Product/Service</label>
              <select
                value={woServiceId}
                onChange={(e) => setWoServiceId(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 text-slate-100 rounded-md p-2 focus:border-blue-500"
              >
                <option value="">-- Choose Target Service --</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Cost (Rs)</label>
              <Input
                type="number"
                value={woAmount}
                onChange={(e) => setWoAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="bg-slate-950 border-white/10 text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Description</label>
              <Textarea
                value={woDescription}
                onChange={(e) => setWoDescription(e.target.value)}
                placeholder="Optional custom instructions..."
                className="bg-slate-950 border-white/10 text-slate-100 h-20 resize-none"
              />
            </div>

            <div className="bg-slate-950/20 p-3 rounded-lg border border-white/5 text-slate-400 flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Channel intake:</span>
                <strong className="text-slate-200">WhatsApp</strong>
              </div>
              <div className="flex justify-between">
                <span>Acceptance status:</span>
                <strong className="text-emerald-400">Accepted (Auto 24/7)</strong>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsWorkOrderModalOpen(false)} className="border border-white/10 text-slate-400">
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Initiate Work Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
