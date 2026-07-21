import React, { createContext, useContext, useState } from 'react';

export interface CompanyTenant {
    id: string;
    name: string;
    code: string;
    gstin: string;
}

export const COMPANIES: CompanyTenant[] = [
    { id: 'c1', name: '24eFiling Corporate Services Pvt Ltd', code: '24E_CORP', gstin: '36AAAC24E1F1Z9' },
    { id: 'c2', name: '24eFiling Legal & IP Advisory', code: '24E_LEGAL', gstin: '36AAAC24E2F1Z8' },
    { id: 'c3', name: '24eFiling Financial Consultancy', code: '24E_FIN', gstin: '36AAAC24E3F1Z7' },
];

interface CompanyContextType {
    activeCompany: CompanyTenant;
    setActiveCompany: (company: CompanyTenant) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCompany, setActiveCompany] = useState<CompanyTenant>(COMPANIES[0]);

    return (
        <CompanyContext.Provider value={{ activeCompany, setActiveCompany }}>
            {children}
        </CompanyContext.Provider>
    );
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) {
        throw new Error('useCompany must be used within CompanyProvider');
    }
    return context;
};
