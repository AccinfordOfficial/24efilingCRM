import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Branch, City } from '../types';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { FormField } from './ui/FormField';
import { FormSelect } from './ui/FormSelect';
import { FormTextarea } from './ui/FormTextarea';
import { Switch } from './ui/Switch';
import { Badge } from './ui/Badge';
import { UserIcon, ChevronDown } from './icons';
import { USER_SKILLS, USER_ROLES_WITH_DESCRIPTIONS, ROLE_PERMISSIONS, getRoleDotColor } from '../constants';
import { userSchema, UserFormValues } from '../lib/validations/userSchema';
import { z } from 'zod';

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

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, onSave, user, branches, cities = [], initialBranchName, allUsers = [] }) => {
    const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const roleDropdownRef = useRef<HTMLDivElement>(null);

    // Dynamic schema validation extending base userSchema to handle password on creation
    const dynamicUserSchema = useMemo(() => {
        if (user) {
            return userSchema;
        }
        return userSchema.extend({
            password: z.string().min(6, 'Password must be at least 6 characters'),
            confirmPassword: z.string().min(6, 'Password must be at least 6 characters')
        }).refine(data => data.password === data.confirmPassword, {
            message: "Passwords do not match",
            path: ["confirmPassword"]
        });
    }, [user]);

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<any>({
        resolver: zodResolver(dynamicUserSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            role: 'Sales Executive',
            department: 'Sales',
            branch_id: '',
            city_id: '',
            address: '',
            date_of_birth: '',
            gender: '',
            is_active: true,
            reporting_to: '',
            employee_code: '',
            password: '',
            confirmPassword: ''
        }
    });

    const watchedRole = watch('role');
    const watchedCityId = watch('city_id');
    const watchedBranchId = watch('branch_id');
    const watchedIsActive = watch('is_active');
    const watchedName = watch('name');
    const watchedEmail = watch('email');
    const watchedPassword = watch('password');

    useEffect(() => {
        if (isOpen) {
            if (user) {
                reset({
                    name: user.name,
                    email: user.email,
                    phone: user.phone_number || '',
                    role: user.role,
                    department: user.department || 'Sales',
                    branch_id: user.branch_id || '',
                    city_id: user.city_id || '',
                    address: user.address || '',
                    date_of_birth: user.date_of_birth || '',
                    gender: user.gender || '',
                    is_active: user.is_active,
                    reporting_to: user.reporting_to || '',
                    employee_code: user.employee_code || '',
                });
                setProfilePicPreview(user.avatar_url);
                setSelectedSkills(user.skills || []);
            } else {
                let defaultBranchId = '';
                if (initialBranchName && initialBranchName !== 'All Branches') {
                    const matchedBranch = branches.find(b => b.name === initialBranchName);
                    if (matchedBranch) {
                        defaultBranchId = matchedBranch.id;
                    }
                }
                reset({
                    name: '',
                    email: '',
                    phone: '',
                    role: 'Sales Executive',
                    department: 'Sales',
                    branch_id: defaultBranchId,
                    city_id: '',
                    address: '',
                    date_of_birth: '',
                    gender: '',
                    is_active: true,
                    reporting_to: '',
                    employee_code: '',
                    password: '',
                    confirmPassword: ''
                });
                setProfilePicPreview(null);
                setSelectedSkills([]);
            }
            setFormError(null);
        }
    }, [user, isOpen, initialBranchName, branches, reset]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Sync city selection changes
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cityId = e.target.value;
        setValue('city_id', cityId);
        
        const cityBranches = branches.filter(b => b.city_id === cityId);
        if (cityBranches.length === 1) {
            setValue('branch_id', cityBranches[0].id);
        } else {
            setValue('branch_id', '');
        }
    };

    // Sync branch selection changes
    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const branchId = e.target.value;
        setValue('branch_id', branchId);
        
        const selectedBranch = branches.find(b => b.id === branchId);
        if (selectedBranch && !watchedCityId && selectedBranch.city_id) {
            setValue('city_id', selectedBranch.city_id);
        }
    };

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicPreview(reader.result as string);
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

    const onSubmit = (data: any) => {
        setFormError(null);

        const selectedBranch = branches.find(b => b.id === data.branch_id);
        const selectedCity = cities.find(c => c.id === data.city_id);

        const currentData = {
            ...data,
            phone_number: data.phone,
            branch_name: selectedBranch ? selectedBranch.name : '',
            city_name: selectedCity ? selectedCity.city_name : '',
            email: data.email?.trim().toLowerCase() || '',
            name: data.name?.trim() || '',
            skills: selectedSkills,
            avatar_url: profilePicPreview
        };

        delete currentData.phone;
        delete currentData.confirmPassword;

        const finalUserData: any = { ...currentData };
        if (user) {
            finalUserData.id = user.id;
        }

        onSave(finalUserData);
    };

    const availableSkills = USER_SKILLS.filter(skill => !selectedSkills.includes(skill));
    const selectedRoleInfo = USER_ROLES_WITH_DESCRIPTIONS.find(r => r.role === watchedRole);
    const permissionsForRole = watchedRole ? ROLE_PERMISSIONS[watchedRole] || [] : [];
    const showBranchField = watchedRole && watchedRole !== 'Super Admin';

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Edit User' : 'Create New User'}
            description="Add a new user to the CRM system with appropriate role and permissions."
            maxWidth="max-w-3xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

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
                        <FormField 
                            label="Full Name" 
                            id="name" 
                            required 
                            placeholder="John Doe" 
                            registration={register('name')}
                            error={errors.name?.message as string}
                        />
                        
                        <FormField 
                            label="Employee Code" 
                            id="employee_code" 
                            placeholder="e.g. EMP-001" 
                            registration={register('employee_code')}
                            error={errors.employee_code?.message as string}
                        />

                        <FormField 
                            label="Email Address" 
                            id="email" 
                            type="email" 
                            required 
                            placeholder="john@example.com" 
                            registration={register('email')}
                            error={errors.email?.message as string}
                        />

                        <FormField 
                            label="Phone Number" 
                            id="phone" 
                            type="tel" 
                            placeholder="9876543210" 
                            registration={register('phone')}
                            error={errors.phone?.message as string}
                        />

                        <FormField 
                            label="Date of Birth" 
                            id="date_of_birth" 
                            type="date" 
                            required 
                            registration={register('date_of_birth')}
                            error={errors.date_of_birth?.message as string}
                        />

                        <FormSelect 
                            label="Gender" 
                            id="gender" 
                            required 
                            registration={register('gender')}
                            error={errors.gender?.message as string}
                        >
                            <option value="" disabled className="bg-slate-950 text-white">-- Select Gender --</option>
                            <option value="Male" className="bg-slate-950 text-white">Male</option>
                            <option value="Female" className="bg-slate-950 text-white">Female</option>
                            <option value="Other" className="bg-slate-950 text-white">Other</option>
                        </FormSelect>

                        {showBranchField && (
                            <>
                                <FormSelect 
                                    label="Assigned City" 
                                    id="city_id" 
                                    registration={register('city_id', { onChange: handleCityChange })}
                                    error={errors.city_id?.message as string}
                                >
                                    <option value="" className="bg-slate-950 text-white">-- All Cities --</option>
                                    {cities.map(c => (
                                        <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.city_name}</option>
                                    ))}
                                </FormSelect>

                                <FormSelect 
                                    label="Assigned Branch" 
                                    id="branch_id" 
                                    required 
                                    registration={register('branch_id', { onChange: handleBranchChange })}
                                    error={errors.branch_id?.message as string}
                                >
                                    <option value="" disabled className="bg-slate-950 text-white">-- Select a Branch --</option>
                                    {branches
                                        .filter(b => !watchedCityId || b.city_id === watchedCityId)
                                        .map(b => (
                                        <option key={b.id} value={b.id} className="bg-slate-950 text-white">{b.name} {b.code ? `(${b.code})` : ''}</option>
                                    ))}
                                </FormSelect>
                            </>
                        )}
                        
                        <FormTextarea 
                            label="Address" 
                            id="address" 
                            rows={2} 
                            placeholder="Full address" 
                            registration={register('address')}
                            error={errors.address?.message as string}
                        />
                        
                        <FormSelect 
                            label="Reporting To" 
                            id="reporting_to" 
                            registration={register('reporting_to')}
                            error={errors.reporting_to?.message as string}
                        >
                            <option value="" className="bg-slate-950 text-white">-- Independent (Or Top Level) --</option>
                            {allUsers.filter(u => u.id !== user?.id).map(u => (
                                <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name} ({u.role})</option>
                            ))}
                        </FormSelect>
                    </div>

                    <div className="space-y-4">
                        {!user && (
                            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 space-y-4">
                                <FormField 
                                    label="Password" 
                                    id="password" 
                                    type="password" 
                                    required 
                                    placeholder="••••••••" 
                                    registration={register('password')}
                                    error={errors.password?.message as string}
                                />
                                <FormField 
                                    label="Confirm Password" 
                                    id="confirmPassword" 
                                    type="password" 
                                    required 
                                    placeholder="••••••••" 
                                    registration={register('confirmPassword')}
                                    error={errors.confirmPassword?.message as string}
                                />
                            </div>
                        )}

                        <div className="p-4 rounded-lg border border-border/50 space-y-4 bg-muted/10">
                            <div className="space-y-1 w-full">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    System Role <span className="text-red-500">*</span>
                                </label>
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
                                            <div className={`h-2 w-2 rounded-full ${getRoleDotColor(watchedRole as User['role'])}`}></div>
                                            <span className="font-medium">{selectedRoleInfo?.role}</span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-muted-foreground opacity-50" />
                                    </button>
                                    {isRoleDropdownOpen && (
                                        <ul className="absolute z-50 w-full mt-1 overflow-auto bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 border-slate-200 dark:border-white/10">
                                            {USER_ROLES_WITH_DESCRIPTIONS.map(roleInfo => (
                                                <li key={roleInfo.role}
                                                    onClick={() => {
                                                        setValue('role', roleInfo.role);
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
                            </div>

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
                    <div className="space-y-1 w-full">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Skills & Expertise</label>
                        <div className="space-y-3">
                            <Select id="skills" onChange={handleAddSkill} value="" className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                                <option value="" disabled className="bg-slate-950 text-white">Select a skill to add...</option>
                                {availableSkills.map(skill => <option key={skill} value={skill} className="bg-slate-950 text-white">{skill}</option>)}
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
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                        <Switch 
                            checked={watchedIsActive || false} 
                            onChange={(checked) => setValue('is_active', checked)} 
                            id="active-user" 
                        />
                        <label htmlFor="active-user" className="text-sm font-medium cursor-pointer select-none">
                            Active Account
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button 
                            type="submit" 
                            disabled={!watchedName || !watchedEmail || (!user && !watchedPassword)}
                        >
                            {user ? 'Save Changes' : 'Create User'}
                        </Button>
                    </div>
                </div>

                {formError && (
                    <div className="rounded-md bg-destructive/15 p-3">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-destructive">Error</h3>
                                <div className="text-sm text-destructive/90 mt-1">
                                    {formError}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        </Dialog>
    );
};