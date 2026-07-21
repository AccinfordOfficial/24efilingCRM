import { Customer } from '../types';

export interface ChurnRiskResult {
    score: number; // 0 (loyal) to 100 (high risk)
    riskLevel: 'High' | 'Medium' | 'Low';
    reasons: string[];
}

export function predictCustomerChurn(customer: Customer, daysSinceLastActivity: number = 45): ChurnRiskResult {
    let score = 20;
    const reasons: string[] = [];

    if (daysSinceLastActivity > 60) {
        score += 40;
        reasons.push(`No portal activity or service requests in ${daysSinceLastActivity} days`);
    } else if (daysSinceLastActivity > 30) {
        score += 20;
        reasons.push(`Low interaction frequency in past month`);
    }

    if (customer.status === 'Inactive') {
        score += 30;
        reasons.push('Customer account marked Inactive');
    }

    const finalScore = Math.min(99, Math.max(5, score));
    let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
    if (finalScore >= 65) riskLevel = 'High';
    else if (finalScore >= 40) riskLevel = 'Medium';

    return {
        score: finalScore,
        riskLevel,
        reasons: reasons.length > 0 ? reasons : ['Account engaged regularly']
    };
}
