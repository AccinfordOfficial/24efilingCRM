import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User } from '../../types';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';

import { supabase } from '../../lib/supabaseClient';
import { Loader2, Camera } from 'lucide-react';

interface ProfileSettingsProps {
    currentUser: User;
    showToast: (type: 'success' | 'error', message: string) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, showToast }) => {
    const { updateUser } = useApi();
    const { refreshProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profileData, setProfileData] = useState({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone_number: currentUser.phone_number || '',
        avatar_url: currentUser.avatar_url || '',
        preferences: (currentUser as any).preferences || { language: 'en', timezone: 'UTC', theme: 'system' }
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateUser({
                ...currentUser,
                name: profileData.name,
                phone_number: profileData.phone_number,
                avatar_url: profileData.avatar_url,
                // Cast to any for new fields until types are updated
                ...{ preferences: profileData.preferences } as any
            });
            await refreshProfile();
            showToast('success', "Profile updated successfully");
        } catch (e: any) {
            showToast('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }
        const file = event.target.files[0];
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
            showToast('success', "Avatar uploaded");
        } catch (error: any) {
            showToast('error', error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleResetTour = async () => {
        try {
            await supabase.auth.updateUser({
                data: { has_completed_tour: false }
            });
            showToast('success', "Interactive onboarding tour reset! Starting tour...");
            setTimeout(() => {
                window.location.href = '/';
            }, 800);
        } catch (e: any) {
            showToast('error', e.message);
        }
    };

    return (
        <Card className="dark:bg-slate-900/80 dark:border-white/10 shadow-sm">
            <CardHeader>
                <CardTitle className="dark:text-white">Profile Information</CardTitle>
                <CardDescription className="dark:text-slate-400">Update your personal details and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-md">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-slate-500 dark:text-slate-400" />
                            ) : profileData.avatar_url ? (
                                <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-slate-400 dark:text-slate-300">{profileData.name.charAt(0)}</span>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{currentUser.name || 'User'}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser.role} • {currentUser.branch_name || 'Head Office'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                        <Input
                            value={profileData.name}
                            onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                            className="bg-background dark:bg-slate-950 text-foreground dark:text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                        <Input
                            value={profileData.email}
                            disabled
                            className="bg-slate-100 dark:bg-slate-900/50 text-slate-500 cursor-not-allowed"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                        <Input
                            value={profileData.phone_number}
                            onChange={e => setProfileData({ ...profileData, phone_number: e.target.value })}
                            placeholder="+91..."
                            className="bg-background dark:bg-slate-950 text-foreground dark:text-white"
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">System Guided Tour</h4>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10">
                        <div>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white block">Platform Onboarding Tour</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Restart the interactive walkthrough of key features.</span>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={handleResetTour} className="border-slate-200 dark:border-white/10 dark:text-white text-xs">
                            Restart Tour
                        </Button>
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-white/10 pt-4">
                    <h4 className="font-bold text-slate-900 dark:text-white mb-3">Preferences</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Language</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={profileData.preferences.language}
                                onChange={e => setProfileData({ ...profileData, preferences: { ...profileData.preferences, language: e.target.value } })}
                            >
                                <option value="en">English</option>
                                <option value="hi">Hindi</option>
                                <option value="te">Telugu</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Timezone</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={profileData.preferences.timezone}
                                onChange={e => setProfileData({ ...profileData, preferences: { ...profileData.preferences, timezone: e.target.value } })}
                            >
                                <option value="UTC">UTC</option>
                                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background dark:bg-slate-950 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={profileData.preferences.theme}
                                onChange={e => setProfileData({ ...profileData, preferences: { ...profileData.preferences, theme: e.target.value } })}
                            >
                                <option value="system">System Default</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave} disabled={saving} variant="primary" className="font-semibold shadow-md">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
