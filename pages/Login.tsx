

import React, { useState } from 'react';
import { SETUP_SQL_SCRIPT } from '../lib/supabaseClient';
import { EfilingLogo, MailIcon, LockIcon, LogInIcon, UserIcon, EyeIcon, EyeOffIcon, SuperAdminIcon, AdminIcon, SalesExecIcon, AlertTriangleIcon } from '../components/icons';
import { useAuth } from '../contexts/AuthContext';

import { Button } from '../components/ui/Button';
import { useToast } from '../components/Toast';

type AuthView = 'signIn' | 'signUp' | 'forgotPassword';
type RoleTab = 'Super Admin' | 'Admin' | 'Sales Executive';

// --- PASSWORD STRENGTH METER ---
const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    if (!password) return 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    if (strength <= 2) return 1; // Weak
    if (strength <= 3) return 2; // Medium
    if (strength <= 4) return 3; // Good
    return 4; // Strong
};

const strengthLevels = [
    { label: '', color: 'bg-transparent', textColor: 'text-transparent' }, // level 0
    { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' },    // level 1
    { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-500' },// level 2
    { label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-500' },    // level 3
    { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-500' }, // level 4
];

const PasswordStrengthMeter: React.FC<{ strength: number }> = ({ strength }) => {
    if (strength === 0) return null;
    const level = strengthLevels[strength];
    return (
        <div className="mt-2 space-y-1">
            <div className="grid grid-cols-4 gap-x-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-1.5 rounded-full transition-colors ${strength > index ? level.color : 'bg-slate-700'
                            }`}
                    />
                ))}
            </div>
            <p className={`text-xs font-medium ${level.textColor}`}>
                {level.label}
            </p>
        </div>
    );
};
// --- END OF PASSWORD STRENGTH METER ---


const Login: React.FC = () => {
    const { signIn, signUp, sendPasswordResetEmail } = useAuth();
    const [activeTab, setActiveTab] = useState<RoleTab>('Super Admin');
    const [view, setView] = useState<AuthView>('signIn');

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const clearForm = () => {
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setShowPassword(false);
        setShowConfirmPassword(false);
        setPasswordStrength(0);
    };

    const handleTabChange = (tab: RoleTab) => {
        setActiveTab(tab);
        setView('signIn'); // Always reset to sign-in view when changing tabs
        clearForm();
    };

    const handleViewChange = (newView: AuthView) => {
        setView(newView);
        clearForm();
    }

    const handleSignInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signIn(email.trim(), password, activeTab);
        } catch (err: any) {
            toast.addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            setLoading(false);
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            await signUp(name.trim(), email.trim(), password);
            toast.addToast('Registration successful! Please check your email to verify your account.', 'success');
            handleViewChange('signIn');
        } catch (err: any) {
            if (err.message && err.message.includes('SETUP_REQUIRED')) {
                setError('SETUP_REQUIRED');
                return;
            }
            toast.addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (error === 'SETUP_REQUIRED') {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <AlertTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-semibold">Database Setup Required</h2>
                    <p className="text-slate-300 text-sm mt-2">
                        Your database policies need to be updated to prevent recursion errors.
                        Please run the following SQL script in your Supabase Dashboard SQL Editor.
                    </p>
                </div>
                <div className="relative">
                    <pre className="bg-slate-900 p-4 rounded-lg overflow-x-auto text-xs text-slate-300 h-64 border border-slate-700 font-mono">
                        {SETUP_SQL_SCRIPT}
                    </pre>
                    <Button
                        className="absolute top-2 right-2 text-xs py-1 h-auto"
                        variant="outline"
                        onClick={() => {
                            navigator.clipboard.writeText(SETUP_SQL_SCRIPT);
                            toast.addToast('SQL Script copied to clipboard!', 'success');
                        }}
                    >
                        Copy SQL
                    </Button>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="w-full" onClick={() => { setError(null); clearForm(); }}>Back</Button>
                    <Button className="w-full" onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}>Open Supabase SQL Editor</Button>
                </div>
            </div>
        );
    }

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await sendPasswordResetEmail(email);
            toast.addToast('Password reset link sent! Please check your email.', 'success');
            handleViewChange('signIn');
        } catch (err: any) {
            toast.addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const roleIcons: Record<RoleTab, React.ElementType> = {
        'Super Admin': SuperAdminIcon,
        'Admin': AdminIcon,
        'Sales Executive': SalesExecIcon,
    };

    const renderForm = () => {
        if (view === 'forgotPassword') {
            return (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold">Forgot Password</h2>
                        <p className="text-slate-300 text-sm mt-1">Enter your email to get a reset link</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">Email Address</label>
                            <div className="relative">
                                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="your-email@example.com" />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-sm text-center text-red-300 bg-red-500/20 p-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full py-3 font-semibold text-base" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <p className="text-center text-sm text-slate-300">
                        Remembered your password?
                        <button type="button" onClick={() => handleViewChange('signIn')} className="font-semibold text-white hover:underline ml-1">
                            Sign In
                        </button>
                    </p>
                </form>
            );
        }

        if (view === 'signUp') {
            return (
                <form onSubmit={handleSignUpSubmit} className="space-y-6">
                    <div className="text-center"><h2 className="text-2xl font-semibold">Create Super Admin Account</h2></div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="name">Full Name</label>
                            <div className="relative"><UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="e.g., John Doe" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">Email Address</label>
                            <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="e.g., superadmin@example.com" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">Password</label>
                            <div className="relative">
                                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setPasswordStrength(calculatePasswordStrength(e.target.value)); }} className="w-full pl-10 pr-10 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="Create a strong password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                    {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <PasswordStrengthMeter strength={passwordStrength} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
                            <div className="relative">
                                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="Confirm your password" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                    {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-sm text-center text-red-300 bg-red-500/20 p-2 rounded-md">{error}</p>}
                    <Button type="submit" className="w-full py-3 font-semibold text-base" disabled={loading}>{loading ? 'Creating Account...' : 'Sign Up'}</Button>
                    <p className="text-center text-sm text-slate-300">Already have an account? <button type="button" onClick={() => handleViewChange('signIn')} className="font-semibold text-white hover:underline ml-1">Sign In</button></p>
                </form>
            );
        }

        // Default is 'signIn'
        return (
            <form onSubmit={handleSignInSubmit} className="space-y-6">
                <div className="text-center"><h2 className="text-2xl font-semibold">Welcome Back, {activeTab}</h2><p className="text-slate-300 text-sm mt-1">Enter your credentials to continue</p></div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">Email Address</label>
                        <div className="relative"><MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="Enter your email" /></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline"><label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">Password</label><button type="button" onClick={() => handleViewChange('forgotPassword')} className="text-xs text-slate-400 hover:text-white hover:underline">Forgot password?</button></div>
                        <div className="relative">
                            <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 bg-slate-900/30 text-white placeholder-slate-400 rounded-lg border border-white/30 focus:ring-2 focus:ring-white/50 focus:outline-none transition" required placeholder="Enter your password" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>
                {error && <p className="text-sm text-center text-red-300 bg-red-500/20 p-2 rounded-md">{error}</p>}
                <Button type="submit" className="w-full py-3 font-semibold text-base" disabled={loading}>{loading ? 'Processing...' : <><LogInIcon className="h-5 w-5 mr-2" />Sign In</>}</Button>
                {activeTab === 'Super Admin' && view === 'signIn' && <p className="text-center text-sm text-slate-300">Don't have an account? <button type="button" onClick={() => handleViewChange('signUp')} className="font-semibold text-white hover:underline ml-1">Create Super Admin Account</button></p>}
                {activeTab !== 'Super Admin' && <p className="text-center text-sm text-slate-300">Please contact a Super Admin for an account.</p>}
            </form>
        );
    };


    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-gray-900 overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')" }} />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 z-10" />

            <main className="relative z-20 w-full max-w-2xl mx-auto px-4">
                <div className="text-center mb-8">
                    <EfilingLogo className="h-24 w-auto mb-4 inline-block" />
                </div>

                <div className="w-full p-8 space-y-6 bg-black/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl text-white">
                    <div className="grid grid-cols-3 gap-2 border-b border-white/20 pb-4">
                        {(['Super Admin', 'Admin', 'Sales Executive'] as const).map(tab => {
                            const Icon = roleIcons[tab];
                            return (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === tab ? 'bg-white/20 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{tab}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="pt-4">
                        {renderForm()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;
