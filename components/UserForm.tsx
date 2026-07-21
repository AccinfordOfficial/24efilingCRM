import React, { useState, useEffect, useRef } from 'react';
import { User, Branch, City } from '../types';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { USER_SKILLS, USER_ROLES_WITH_DESCRIPTIONS, ROLE_PERMISSIONS, getRoleDotColor } from '../constants';
import { Switch } from './ui/Switch';
import { Badge } from './ui/Badge';
import { UserIcon, ChevronDown } from './icons';

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: (User | Omit<User, 'id'>) & { password?: string }) => void;
    user: User | null;
    branches: Branch[];
    cities?: City[];
    initialBranchName?: string | null;
    allUsers?: User[];
}

const initialFormState: Omit<User, 'id' | 'avatar_url' | 'created_at' | 'last_updated'> = {
    name: '',
    email: '',
    phone_number: '',
    role: 'Sales Executive',
    department: 'Sales',
    skills: [],
    branch_name: '',
    branch_id: '',
    city_id: '',
    city_name: '',
    address: '',
    date_of_birth: '',
    gender: '' as any,
    is_active: true,
    reporting_to: '',
    employee_code: '',
};

const FormField: React.FC<{ label: string, id: string, children: React.ReactNode, required?: boolean }> = ({ label, id, children, required }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSave, user, branches, cities = [], initialBranchName, allUsers = [] }) => {
    const [formData, setFormData] = useState<Omit<User, 'id' | 'avatar_url' | 'created_at' | 'last_updated'>>(initialFormState);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                phone_number: user.phone_number || '',
                role: user.role,
                department: user.department || 'Sales',
                skills: user.skills || [],
                branch_name: user.branch_name || '',
                branch_id: user.branch_id || '',
                city_id: user.city_id || '',
                city_name: user.city_name || '',
                address: user.address || '',
                date_of_birth: user.date_of_birth || '',
                gender: user.gender || '' as any,
                is_active: user.is_active,
                reporting_to: user.reporting_to || '',
                employee_code: user.employee_code || '',
            });
            setProfilePicPreview(user.avatar_url);
            setSelectedSkills(user.skills || []);
            setPassword('');
            setConfirmPassword('');
            setError(null);
        } else {
            let initialState = { ...initialFormState };
            if (initialBranchName && initialBranchName !== 'All Branches') {
                const matchedBranch = branches.find(b => b.name === initialBranchName);
                if (matchedBranch) {
                    initialState.branch_name = matchedBranch.name;
                    initialState.branch_id = matchedBranch.id;
                }
            }
            setFormData(initialState);
            setProfilePicPreview(null);
            setSelectedSkills([]);
            setPassword('');
            setConfirmPassword('');
            setError(null);
        }
    }, [user, isOpen, initialBranchName, branches]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'city_id') {
                const selectedCity = cities.find(c => c.id === value);
                if (selectedCity) {
                    next.city_name = selectedCity.city_name;
                    // Auto-select branch if only one or clear branch if not matching
                    const cityBranches = branches.filter(b => b.city_id === value);
                    if (cityBranches.length === 1) {
                        next.branch_id = cityBranches[0].id;
                        next.branch_name = cityBranches[0].name;
                    } else {
                        next.branch_id = '';
                        next.branch_name = '';
                    }
                } else {
                    next.city_name = '';
                }
            } else if (name === 'branch_id') {
                const selectedBranch = branches.find(b => b.id === value);
                if (selectedBranch) {
                    next.branch_name = selectedBranch.name;
                    // Auto-select city if not selected
                    if (!next.city_id && selectedBranch.city_id) {
                        next.city_id = selectedBranch.city_id;
                        const city = cities.find(c => c.id === selectedBranch.city_id);
                        if (city) next.city_name = city.city_name;
                    }
                } else {
                    next.branch_name = '';
                }
            }
            return next;
        });
    };

    const handleActiveChange = (checked: boolean) => {
        setFormData((prev) => ({ ...prev, is_active: checked }));
    };

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicPreview(reader.result as string);
                setFormData(prev => ({ ...prev, avatar_url: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddSkill = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const skill = e.target.value;
        if (skill && !selectedSkills.includes(skill)) {
            setSelectedSkills([...selectedSkills, skill]);
        }
        e.target.value = '';
    };

    const handleRemoveSkill = (skillToRemove: string) => {
        setSelectedSkills(selectedSkills.filter(skill => skill !== skillToRemove));
    };

    const availableSkills = USER_SKILLS.filter(skill => !selectedSkills.includes(skill));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Sanitize form data
        const currentData = {
            ...formData,
            email: formData.email?.replace(/[^a-zA-Z0-9@._\-+]/g, '').toLowerCase() || '',
            name: formData.name?.trim() || '',
        };

        if (!user) { // New user validation
            if (!password || password.length < 6) {
                setError("Password must be at least 6 characters.");
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }
        
        if (!currentData.date_of_birth) {
            setError("Date of birth is required.");
            return;
        }
        if (!currentData.gender) {
            setError("Gender is required.");
            return;
        }

        const finalUserData: any = {
            ...currentData,
            skills: selectedSkills,
        };

        if (user) {
            finalUserData.id = user.id;
        } else {
            finalUserData.password = password;
        }

        onSave(finalUserData);
    };

    const selectedRoleInfo = USER_ROLES_WITH_DESCRIPTIONS.find(r => r.role === formData.role);
    const permissionsForRole = formData.role ? ROLE_PERMISSIONS[formData.role] || [] : [];
    const showBranchField = formData.role && formData.role !== 'Super Admin';

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Edit User' : 'Create New User'}
            description="Add a new user to the CRM system with appropriate role and permissions."
            maxWidth="max-w-3xl" // Increased max width for 2-column layout
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Profile Header Section */}
                <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="relative group">
                        {profilePicPreview ? (
                            <img src={profilePicPreview} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-background shadow-sm" />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center ring-2 ring-background shadow-sm">
                                <UserIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                            </div>
                        )}
                        <label
                            htmlFor="profile-pic-upload"
                            className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 shadow-md transition-colors"
                            title="Upload Photo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                        </label>
                        <input id="profile-pic-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleProfilePicChange} />
                    </div>
                    <div className="flex-1 space-y-1">
                        <h3 className="font-medium text-lg leading-none">Profile Picture</h3>
                        <p className="text-sm text-muted-foreground">Upload a professional photo. Recommended size 400x400px.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <FormField label="Full Name" id="name" required>
                            <Input name="name" id="name" placeholder="John Doe" value={formData.name || ''} onChange={handleChange} required className="bg-background" />
                        </FormField>
                        
                        <FormField label="Employee Code" id="employee_code">
                            <Input name="employee_code" id="employee_code" placeholder="e.g. EMP-001" value={formData.employee_code || ''} onChange={handleChange} className="bg-background" />
                        </FormField>

                        <FormField label="Email Address" id="email" required>
                            <Input name="email" id="email" type="email" placeholder="john@example.com" value={formData.email || ''} onChange={handleChange} required className="bg-background" />
                        </FormField>

                        <FormField label="Phone Number" id="phone">
                            <Input name="phone_number" id="phone" type="tel" placeholder="+91 9876543210" value={formData.phone_number || ''} onChange={handleChange} className="bg-background" />
                        </FormField>

                        <FormField label="Date of Birth" id="date_of_birth" required>
                            <Input name="date_of_birth" id="date_of_birth" type="date" value={formData.date_of_birth || ''} onChange={handleChange} required className="bg-background" />
                        </FormField>

                        <FormField label="Gender" id="gender" required>
                            <Select name="gender" id="gender" value={formData.gender || ''} onChange={handleChange} required className="bg-background">
                                <option value="" disabled>-- Select Gender --</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </Select>
                        </FormField>

                        {showBranchField && (
                            <>
                                <FormField label="Assigned City" id="city_id">
                                    <Select name="city_id" id="city_id" value={formData.city_id || ''} onChange={handleChange} className="bg-background">
                                        <option value="">-- All Cities --</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.id}>{c.city_name}</option>
                                        ))}
                                    </Select>
                                </FormField>

                                <FormField label="Assigned Branch" id="branch_id" required>
                                    <Select name="branch_id" id="branch_id" value={formData.branch_id || ''} onChange={handleChange} required className="bg-background">
                                        <option value="" disabled>-- Select a Branch --</option>
                                        {branches
                                            .filter(b => !formData.city_id || b.city_id === formData.city_id)
                                            .map(b => (
                                            <option key={b.id} value={b.id}>{b.name} {b.code ? `(${b.code})` : ''}</option>
                                        ))}
                                    </Select>
                                </FormField>
                            </>
                        )}
                        
                        <FormField label="Address" id="address">
                            <textarea
                                name="address"
                                id="address"
                                rows={2}
                                placeholder="Full address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </FormField>
                        
                        <FormField label="Reporting To" id="reporting_to">
                            <Select name="reporting_to" id="reporting_to" value={formData.reporting_to || ''} onChange={handleChange} className="bg-background">
                                <option value="">-- Independent (Or Top Level) --</option>
                                {allUsers.filter(u => u.id !== user?.id).map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                            </Select>
                        </FormField>
                    </div>

                    <div className="space-y-4">
                        {!user && (
                            <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-4">
                                <FormField label="Password" id="password" required>
                                    <Input name="password" id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-900 border-white/10 text-white placeholder-slate-600 rounded-lg" />
                                </FormField>
                                <FormField label="Confirm Password" id="confirmPassword" required>
                                    <Input name="confirmPassword" id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="bg-slate-900 border-white/10 text-white placeholder-slate-600 rounded-lg" />
                                </FormField>
                            </div>
                        )}

                        <div className="p-4 rounded-lg border border-border/50 space-y-4 bg-muted/10">
                            <FormField label="System Role" id="role" required>
                                <div className="relative" ref={roleDropdownRef}>
                                    <button
                                        id="role"
                                        type="button"
                                        onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                        className="flex items-center justify-between w-full h-auto min-h-[42px] px-3 py-2 text-sm text-left bg-background border rounded-md border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        aria-haspopup="listbox"
                                        aria-expanded={isRoleDropdownOpen}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${getRoleDotColor(formData.role as User['role'])}`}></div>
                                            <span className="font-medium">{selectedRoleInfo?.role}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                    </button>
                                    {isRoleDropdownOpen && (
                                        <ul
                                            className="absolute z-50 w-full mt-1 overflow-auto bg-popover text-popover-foreground border rounded-md shadow-md max-h-60"
                                        >
                                            {USER_ROLES_WITH_DESCRIPTIONS.map(roleInfo => (
                                                <li key={roleInfo.role}
                                                    onClick={() => {
                                                        handleChange({ target: { name: 'role', value: roleInfo.role } } as any);
                                                        setIsRoleDropdownOpen(false);
                                                    }}
                                                    className="flex flex-col gap-1 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground border-b border-border/50 last:border-0"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-2 w-2 rounded-full ${getRoleDotColor(roleInfo.role)}`}></div>
                                                        <span className="font-medium">{roleInfo.role}</span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground ml-4">{roleInfo.description}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </FormField>

                            {permissionsForRole.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Permissions</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {permissionsForRole.slice(0, 4).map(permission => (
                                            <Badge key={permission} variant="outline" className="text-[10px] py-0 h-5 bg-background">{permission}</Badge>
                                        ))}
                                        {permissionsForRole.length > 4 && (
                                            <Badge variant="outline" className="text-[10px] py-0 h-5 bg-background">+{permissionsForRole.length - 4} more</Badge>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="border-t border-border pt-6">
                    <FormField label="Skills & Expertise" id="skills">
                        <div className="space-y-3">
                            <Select id="skills" onChange={handleAddSkill} value="" className="bg-background">
                                <option value="" disabled>Select a skill to add...</option>
                                {availableSkills.map(skill => <option key={skill} value={skill}>{skill}</option>)}
                            </Select>
                            <div className="flex flex-wrap gap-2 min-h-[32px] p-1">
                                {selectedSkills.map(skill => (
                                    <Badge key={skill} variant="secondary" className="pl-2 pr-1 py-1 text-xs gap-1">
                                        {skill}
                                        <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:bg-black/10 rounded-full p-0.5 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                        </button>
                                    </Badge>
                                ))}
                                {selectedSkills.length === 0 && <span className="text-sm text-muted-foreground italic px-2">No skills added yet.</span>}
                            </div>
                        </div>
                    </FormField>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <Switch checked={formData.is_active || false} onChange={handleActiveChange} id="active-user" />
                        <label htmlFor="active-user" className="text-sm font-medium cursor-pointer select-none">
                            Active Account
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={!formData.name || !formData.email || (!user && !password)}>
                            {user ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/15 p-3">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-destructive">Error</h3>
                                <div className="text-sm text-destructive/90 mt-1">
                                    {error}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </Dialog>
    );
};