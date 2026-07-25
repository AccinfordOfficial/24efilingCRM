
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from './ui/Card';
import { Input } from './ui/Input';
import { VoiceChatIcon, XIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';


import { useNavigate } from 'react-router-dom';
import { ENV } from '../lib/env';

interface Message {
    role: 'user' | 'model';
    text: string;
}

import { sanitizeHtml } from '../lib/sanitize';

const Markdown = ({ content }: { content: string }) => {
    const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/```([\s\S]*?)```/g, (match, p1) => `<pre class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 p-2 rounded-md overflow-x-auto text-xs"><code>${p1.trim()}</code></pre>`)
        .replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-1 rounded-sm text-xs">$1</code>')
        .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(formattedContent) }} />;
};



export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'ai' | 'whatsapp'>('ai');
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { profile } = useAuth();
    
    useEffect(() => {
        if (!profile) return;

        if (ENV.GOOGLE_GENAI_API_KEY) {
            try {
                const ai = new GoogleGenAI({ apiKey: ENV.GOOGLE_GENAI_API_KEY });
                const chatSession = ai.chats.create({
                  model: 'gemini-2.5-flash',
                  config: {
                    systemInstruction: `You are a helpful AI assistant for a CRM application called "24efiling CRM". Your purpose is to answer questions about the CRM, sales processes, and general business queries. The current user is ${profile.name} with the role of ${profile.role}. Be concise, helpful, and use markdown for formatting.`
                  }
                });
                setChat(chatSession);
                setMessages([{ role: 'model', text: 'Hello! I am the 24efiling AI assistant. How can I help you today?' }]);
                setIsConfigured(true);
            } catch (error) {
                console.error("Failed to initialize Gemini:", error);
                setMessages([{ role: 'model', text: "Sorry, I'm having trouble connecting. The API key might be invalid."}]);
                setIsConfigured(false);
            }
        } else {
             setMessages([{ role: 'model', text: "AI Assistant is currently offline. Administrator: Please configure the Gemini API key to enable this feature."}]);
             setIsConfigured(false);
        }
    }, [profile]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading || !chat) return;

        const userMessage: Message = { role: 'user', text: trimmedInput };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // FIX: Correctly access the response text using the '.text' property, not the '.text()' method.
            const response: GenerateContentResponse = await chat.sendMessage({ message: trimmedInput });
            const modelMessage: Message = { role: 'model', text: response.text || "Sorry, I couldn't generate a response." };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage: Message = { role: 'model', text: "I'm sorry, but I encountered an error. Please try asking again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 1).toUpperCase();
    }

    return (
        <>
            <div className={`fixed bottom-24 right-6 z-40 w-full max-w-sm transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <Card className="flex flex-col h-[60vh] shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
                    <CardHeader className="flex flex-col gap-2 p-4 pb-2">
                        <div className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <VoiceChatIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">CRM AI Communication</CardTitle>
                                    <CardDescription className="text-[10px] text-slate-500 dark:text-slate-400">Contextual helper & messaging center</CardDescription>
                                </div>
                            </div>
                             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white" onClick={() => setIsOpen(false)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-950/40 p-0.5 rounded-lg border border-slate-200 dark:border-white/5 mt-2">
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                                    activeTab === 'ai' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                Internal Assistant
                            </button>
                            <button
                                onClick={() => setActiveTab('whatsapp')}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                                    activeTab === 'whatsapp' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                WhatsApp Streams
                            </button>
                        </div>
                    </CardHeader>

                    {/* Tab 1: AI Assistant */}
                    {activeTab === 'ai' && (
                        <>
                            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, index) => (
                                    <div key={index} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'model' && <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center justify-center flex-shrink-0 text-primary"><VoiceChatIcon className="h-4 w-4" /></div>}
                                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                                        }`}>
                                           <Markdown content={msg.text} />
                                        </div>
                                        {msg.role === 'user' && <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-800 dark:text-white font-semibold text-xs">{getInitials(profile?.name || 'User')}</div>}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-2.5 justify-start">
                                        <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 flex items-center justify-center flex-shrink-0 text-primary"><VoiceChatIcon className="h-4 w-4" /></div>
                                        <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-bl-none">
                                            <div className="flex items-center space-x-1">
                                                <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                                <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                                <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse"></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={isConfigured ? "Ask me anything..." : "AI Assistant is offline."}
                                        autoComplete="off"
                                        className="bg-background dark:bg-slate-950 border-input dark:border-white/10 text-foreground dark:text-slate-100 text-xs focus:border-primary"
                                        disabled={isLoading || !chat || !isConfigured}
                                    />
                                    <Button type="submit" size="icon" className="bg-primary text-primary-foreground hover:opacity-90" disabled={isLoading || !inputValue.trim() || !chat || !isConfigured}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                                    </Button>
                                </form>
                            </CardFooter>
                        </>
                    )}

                    {/* Tab 2: WhatsApp Streams Quick Links */}
                    {activeTab === 'whatsapp' && (
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                            <div className="text-center py-4 space-y-2 border-b border-slate-200 dark:border-white/5 pb-4">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Incoming Customer Chats</p>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/whatsapp');
                                    }}
                                    className="bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-bold uppercase tracking-wider py-1 h-7"
                                >
                                    Open Meta Broadcast Hub
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {[
                                    { name: 'Amit Sharma', phone: '+919876543210', msg: 'Hi, I need assistance registering...', unread: true },
                                    { name: 'Priya Patel', phone: '+919811223344', msg: 'Thank you for the quick update...', unread: false },
                                    { name: 'Vijay Kumar', phone: '+919555667788', msg: 'I want to initiate a work order...', unread: true }
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/whatsapp');
                                        }}
                                        className="p-2.5 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-lg cursor-pointer transition-colors flex justify-between items-center text-xs"
                                    >
                                        <div className="min-w-0 flex-1 pr-2">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.msg}</p>
                                        </div>
                                        {item.unread && (
                                            <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            <Button
                variant="primary"
                size="lg"
                className="fixed bottom-6 right-6 z-40 rounded-full w-16 h-16 shadow-xl bg-blue-600 hover:bg-blue-700 border-none flex items-center justify-center text-white"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <VoiceChatIcon className="h-7 w-7" />
                <span className="sr-only">Open AI Chatbot</span>
            </Button>
        </>
    );
};
