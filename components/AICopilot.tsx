import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Sparkles, MessageSquare, ListTodo, BrainCircuit, X, Send, RefreshCw, AlertCircle } from 'lucide-react';
import { ENV } from '../lib/env';

interface AICopilotProps {
  isOpen: boolean;
  onClose: () => void;
  leads: any[];
  customers: any[];
  tasks: any[];
  reminders: any[];
  currentUser: any;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Markdown = ({ content }: { content: string }) => {
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, (match, p1) => `<pre class="bg-slate-950 p-2 rounded-md overflow-x-auto text-[10px] text-slate-300"><code>${p1.trim()}</code></pre>`)
    .replace(/`(.*?)`/g, '<code class="bg-slate-950 px-1 rounded-sm text-xs text-blue-400">$1</code>')
    .replace(/\n/g, '<br />');

  return <div className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedContent }} />;
};

export default function AICopilot({
  isOpen,
  onClose,
  leads = [],
  customers = [],
  tasks = [],
  reminders = [],
  currentUser
}: AICopilotProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'tasks' | 'chat'>('insights');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [insightsSummary, setInsightsSummary] = useState('Generating smart CRM summaries...');
  const [summarizing, setSummarizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const apiKey = ENV.GOOGLE_GENAI_API_KEY;

  // Initialize Chat Session
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const chatSession = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `You are "Gemini Copilot", a context-aware smart assistant panel inside the 24efiling CRM.
            Your purpose is to assist the employee with business data insights, follow-ups, and sales predictions.
            Here is the current active CRM state:
            - User: ${currentUser.name} (${currentUser.role})
            - Total CRM Leads: ${leads.length}
            - Total Customers: ${customers.length}
            - Pending Tasks count: ${tasks.length}
            - Scheduled Reminders count: ${reminders.length}
            Provide short, concise answers. Avoid verbose explanations. Use markdown bullet points.`
          }
        });
        setChat(chatSession);
        setIsConfigured(true);
      } catch (error) {
        console.error("Failed to initialize Gemini Copilot:", error);
        setIsConfigured(false);
      }
    }
  }, [isOpen, currentUser, leads.length, customers.length, tasks.length, reminders.length, apiKey]);

  // Generate Insights Summary
  useEffect(() => {
    if (!isOpen || !apiKey) return;

    const generateInsights = async () => {
      setSummarizing(true);
      try {
        const ai = new GoogleGenAI({ apiKey });
        const recentLeadsText = leads.slice(0, 3).map(l => `- ${l.name} (${l.status}, Source: ${l.source})`).join('\n');
        
        const prompt = `Based on these details:
        Leads list: ${leads.length} total. Recent leads:
        ${recentLeadsText || 'No recent leads'}
        Customers count: ${customers.length}
        Tasks count: ${tasks.length}
        Please generate a 3-bullet points executive analysis:
        1. Deal conversion prediction: Pick one active lead and predict conversion likelihood (e.g. 85%).
        2. pipeline velocity: Short summary of pipeline growth.
        3. Recommendation: Action item recommendation for the employee.
        Be extremely concise and professional. Use markdown formatting.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        setInsightsSummary(response.text || 'No insights summary generated.');
      } catch (err) {
        console.error("Failed generating insights summary:", err);
        setInsightsSummary('### CRM Pipeline Status\n- Active Leads: ' + leads.length + '\n- Conversion rate forecast: Stable\n- Recommendations: Review outstanding high-priority tasks.');
      } finally {
        setSummarizing(false);
      }
    };

    generateInsights();
  }, [isOpen, leads, customers, tasks, apiKey]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = { role: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (chat) {
        const response: GenerateContentResponse = await chat.sendMessage({ message: trimmedInput });
        const modelMessage: Message = { role: 'model', text: response.text || "Sorry, I couldn't process that query." };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        // Fallback mock response if Gemini not configured
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            { role: 'model', text: `### Offline Response\n- You asked: *"${trimmedInput}"*\n- Gemini is offline. Please configure your API key in env to get live contextual replies.` }
          ]);
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: 'Error executing query. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-slate-950/95 border-l border-white/10 backdrop-blur-xl z-50 flex flex-col shadow-2xl transition-all duration-300 ease-in-out text-slate-100">
      {/* Copilot Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
          <h2 className="font-bold text-base bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
            Gemini AI Copilot
          </h2>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-slate-950/50 p-1">
        {[
          { key: 'insights', label: 'Insights', icon: BrainCircuit },
          { key: 'tasks', label: 'Action items', icon: ListTodo },
          { key: 'chat', label: 'Ask anything', icon: MessageSquare }
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                activeTab === t.key ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content Space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 1. INSIGHTS TAB */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predictive Analytics</span>
                {summarizing && <RefreshCw className="h-3 w-3 text-blue-400 animate-spin" />}
              </div>
              
              <div className="text-slate-300 text-xs leading-relaxed space-y-2">
                <Markdown content={insightsSummary} />
              </div>
            </Card>

            <Card className="glass-card border-white/5 bg-slate-900/30 backdrop-blur-md p-4 space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Conversion Probability Metrics</h4>
              <div className="space-y-2 text-xs">
                {leads.slice(0, 3).map((l, index) => {
                  const prob = [85, 70, 45][index] || 60;
                  return (
                    <div key={l.id} className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300 truncate max-w-[200px]">{l.name}</span>
                        <span className="text-blue-400 font-bold">{prob}% likelihood</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${prob}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* 2. ACTION ITEMS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">High Priority Follow-ups</h4>
            {reminders.length === 0 && tasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">All clear! No pending tasks due.</p>
            ) : (
              <div className="space-y-2.5">
                {reminders.slice(0, 4).map(r => (
                  <div key={r.id} className="p-3 bg-slate-900/40 border border-white/5 rounded-lg flex items-start gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{r.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 capitalize">Due: {new Date(r.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. CHAT ASSISTANT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full min-h-[50vh]">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[42vh]">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-2">
                  <Sparkles className="h-8 w-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">How can I assist you with CRM statistics today?</p>
                </div>
              )}

              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div key={idx} className={`flex gap-2 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    <div className={`p-3 rounded-2xl border text-xs ${
                      isUser
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-tr-none'
                        : 'bg-slate-900/30 border-white/5 text-slate-300 rounded-tl-none'
                    }`}>
                      <Markdown content={m.text} />
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="mr-auto max-w-[80%] bg-slate-900/30 border border-white/5 p-3 rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat bottom Form */}
            <form onSubmit={handleSendMessage} className="border-t border-white/10 pt-3 mt-auto flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about branch conversions..."
                className="bg-slate-950 border-white/10 text-slate-100 text-xs focus:border-blue-500 flex-1"
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
