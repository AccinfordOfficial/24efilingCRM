import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormField } from '../components/ui/FormField';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

import { toast } from 'sonner';
import { MessageSquare, Send } from 'lucide-react';

interface TeamMessage {
    id: string;
    channel: string;
    sender_name: string;
    content: string;
    created_at: string;
}

export const TeamChat: React.FC = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<TeamMessage[]>([]);
    const [activeChannel, setActiveChannel] = useState('general');
    const [inputMessage, setInputMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchMessages = async () => {
        try {
            const { data } = await supabase
                .from('team_messages')
                .select('*')
                .eq('channel', activeChannel)
                .order('created_at', { ascending: true });

            setMessages((data || []) as TeamMessage[]);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchMessages();

        // Subscribe to realtime changes
        const channelSub = supabase
            .channel('public:team_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
                const newMsg = payload.new as TeamMessage;
                if (newMsg.channel === activeChannel) {
                    setMessages(prev => [...prev, newMsg]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channelSub);
        };
    }, [activeChannel]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        try {
            setIsSubmitting(true);
            const { error } = await (supabase.from('team_messages') as any).insert([{
                channel: activeChannel,
                sender_id: profile?.id,
                sender_name: profile?.name || 'User',
                content: inputMessage.trim()
            }]);

            if (error) throw error;
            setInputMessage('');
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to send message");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Internal Team Chat & Collaboration</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time messaging channels for sales executives, branch managers, and GST operation teams.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Channel Sidebar */}
                <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 md:col-span-1 p-4 space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Channels</h3>
                    {['general', 'sales', 'gst-operations', 'announcements'].map(ch => (
                        <button
                            key={ch}
                            onClick={() => setActiveChannel(ch)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                activeChannel === ch ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <span>#</span> {ch}
                        </button>
                    ))}
                </Card>

                {/* Chat Feed */}
                <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 md:col-span-3 flex flex-col h-[500px]">
                    <CardHeader className="border-b border-slate-200 dark:border-white/10 pb-3">
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" /> #{activeChannel}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length > 0 ? (
                            messages.map((m) => (
                                <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-white/5 space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-primary">{m.sender_name}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(m.created_at).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-800 dark:text-slate-200">{m.content}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400 py-12 text-center">No messages in #{activeChannel} yet. Start the conversation!</p>
                        )}
                    </CardContent>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-white/10 flex gap-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={`Message #${activeChannel}...`}
                            className="flex-1 bg-background dark:bg-slate-950 border border-input dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-foreground dark:text-white focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                        <Button type="submit" disabled={isSubmitting} className="bg-primary text-primary-foreground hover:opacity-90">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};
