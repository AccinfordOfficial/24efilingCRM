import React, { useState, useEffect } from 'react';
import { User, City, Branch } from '../../types';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface TransferUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    cities: City[];
    branches: Branch[];
    onTransfer: (userId: string, toCityId: string, toCityName: string, toBranchId: string, toBranchName: string) => void;
}

export const TransferUserModal: React.FC<TransferUserModalProps> = ({ isOpen, onClose, user, cities, branches, onTransfer }) => {
    const [transferType, setTransferType] = useState<'Branch Transfer' | 'City Transfer'>('Branch Transfer');
    const [selectedCityId, setSelectedCityId] = useState('');
    const [selectedBranchId, setSelectedBranchId] = useState('');

    useEffect(() => {
        if (user && isOpen) {
            setSelectedCityId(user.city_id || '');
            setSelectedBranchId('');
            setTransferType('Branch Transfer');
        }
    }, [user, isOpen]);

    const handleTransferTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value as 'Branch Transfer' | 'City Transfer';
        setTransferType(type);
        if (type === 'Branch Transfer' && user?.city_id) {
            setSelectedCityId(user.city_id);
        } else {
            setSelectedCityId('');
        }
        setSelectedBranchId('');
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCityId(e.target.value);
        setSelectedBranchId('');
    };

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBranchId(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedCityId || !selectedBranchId) return;

        const city = cities.find(c => c.id === selectedCityId);
        const branch = branches.find(b => b.id === selectedBranchId);

        if (city && branch) {
            onTransfer(user.id, city.id, city.city_name, branch.id, branch.name);
            onClose();
        }
    };

    if (!user) return null;

    const availableBranches = branches.filter(b => b.city_id === selectedCityId);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Transfer ${user.name}`}
            description="Transfer this employee to a new branch or city."
            maxWidth="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                <div className="p-4 rounded-xl bg-slate-900/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Employee Name</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{user.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Current Role</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{user.role}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Current City</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{user.city_name || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium block uppercase tracking-wider text-[10px]">Current Branch</span>
                            <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{user.branch_name || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transfer Type</label>
                    <Select value={transferType} onChange={handleTransferTypeChange} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        <option value="Branch Transfer" className="bg-slate-950 text-white">Branch Transfer (Same City)</option>
                        <option value="City Transfer" className="bg-slate-950 text-white">City Transfer</option>
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target City</label>
                    <Select value={selectedCityId} onChange={handleCityChange} disabled={transferType === 'Branch Transfer'} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        <option value="" disabled className="bg-slate-950 text-white">-- Select City --</option>
                        {cities.map(c => (
                            <option key={c.id} value={c.id} className="bg-slate-950 text-white">{c.city_name}</option>
                        ))}
                    </Select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Branch</label>
                    <Select value={selectedBranchId} onChange={handleBranchChange} disabled={!selectedCityId} className="bg-background dark:bg-slate-950 text-foreground dark:text-white border-input dark:border-white/10">
                        <option value="" disabled className="bg-slate-950 text-white">-- Select Branch --</option>
                        {availableBranches.map(b => (
                            <option key={b.id} value={b.id} disabled={b.id === user.branch_id} className="bg-slate-950 text-white">{b.name} {b.code ? `(${b.code})` : ''}</option>
                        ))}
                    </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                    <Button type="button" variant="ghost" onClick={onClose} className="dark:text-slate-400 dark:hover:text-white">Cancel</Button>
                    <Button type="submit" disabled={!selectedCityId || !selectedBranchId} className="bg-primary hover:bg-primary/95 text-white">Complete Transfer</Button>
                </div>
            </form>
        </Dialog>
    );
};
