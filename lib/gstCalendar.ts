export interface GstFilingDeadline {
    returnType: 'GSTR-1' | 'GSTR-3B' | 'GSTR-9';
    dueDate: string;
    description: string;
}

export function getUpcomingGstDeadlines(year: number, month: number): GstFilingDeadline[] {
    // month is 1-indexed
    const nextMonth = month === 12 ? 1 : month + 1;
    const yearForNextMonth = month === 12 ? year + 1 : year;

    const formattedMonth = String(nextMonth).padStart(2, '0');

    return [
        {
            returnType: 'GSTR-1',
            dueDate: `${yearForNextMonth}-${formattedMonth}-11`,
            description: 'Outward supplies statement (Monthly turnover > ₹5 Cr)'
        },
        {
            returnType: 'GSTR-3B',
            dueDate: `${yearForNextMonth}-${formattedMonth}-20`,
            description: 'Monthly summary return & tax payment'
        },
        {
            returnType: 'GSTR-9',
            dueDate: `${year}-12-31`,
            description: 'Annual GST reconciliation return'
        }
    ];
}

export function calculateGstLateFee(daysOverdue: number, isNilReturn: boolean = false): number {
    if (daysOverdue <= 0) return 0;
    const dailyRate = isNilReturn ? 20 : 50; // ₹20/day for Nil, ₹50/day for Regular
    const maxFeePerReturn = 10000; // Cap
    return Math.min(maxFeePerReturn, daysOverdue * dailyRate);
}
