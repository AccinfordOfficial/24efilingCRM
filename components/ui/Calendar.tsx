import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../icons';

interface CalendarProps {
  dateRange?: { from?: string; to?: string };
  onDateChange: (range: { from: string; to: string }) => void;
}

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESET_RANGES = [
    { label: 'Today', value: 'today' },
    { label: 'Weekly', value: 'this_week' },
    { label: 'Monthly', value: 'this_month' },
    { label: 'Quarterly', value: 'last_90_days' },
    { label: 'Yearly', value: 'this_year' },
];

const getISODateString = (date: Date) => date.toISOString().split('T')[0];

export const Calendar: React.FC<CalendarProps> = ({ dateRange = { from: '', to: '' }, onDateChange }) => {
  const [currentDate, setCurrentDate] = useState(dateRange.from ? new Date(`${dateRange.from}T00:00:00`) : new Date());
  const { from = '', to = '' } = dateRange;

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isoString = selectedDate.toISOString().split('T')[0];

    if (!from || (from && to)) {
      onDateChange({ from: isoString, to: '' });
    } else {
      // Parse 'from' as local date to prevent timezone issues
      const fromDate = new Date(`${from}T00:00:00`);
      if (selectedDate < fromDate) {
        onDateChange({ from: isoString, to: '' });
      } else {
        onDateChange({ from, to: isoString });
      }
    }
  };

  const handlePresetClick = (presetValue: string) => {
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    let from = new Date();
    from.setHours(0, 0, 0, 0);

    switch(presetValue) {
        case 'today':
            break;
        case 'this_week': {
            const dayOfWeek = from.getDay();
            from.setDate(from.getDate() - dayOfWeek);
            break;
        }
        case 'this_month':
            from = new Date(to.getFullYear(), to.getMonth(), 1);
            break;
        case 'last_90_days':
            from.setDate(to.getDate() - 89);
            break;
        case 'this_year':
            from = new Date(to.getFullYear(), 0, 1);
            break;
    }
    
    onDateChange({ from: getISODateString(from), to: getISODateString(to) });
  };

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="text-center"></div>);
    }
    
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T00:00:00`) : null;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      
      const isFrom = fromDate && dayDate.getTime() === fromDate.getTime();
      const isTo = toDate && dayDate.getTime() === toDate.getTime();
      const isInRange = fromDate && toDate && dayDate > fromDate && dayDate < toDate;
      const isToday = new Date().toDateString() === dayDate.toDateString();
      
      let dayClasses = 'h-9 w-9 flex items-center justify-center rounded-full cursor-pointer transition-colors text-sm';
      let wrapperClasses = 'p-0.5';

      if (isFrom || isTo) {
        dayClasses += ' bg-[#1c398e] text-white font-semibold';
      } else if (isInRange) {
        dayClasses += ' bg-blue-100 text-[#1c398e] rounded-none';
        wrapperClasses += ' bg-blue-100';
      } else {
        dayClasses += ' hover:bg-slate-100';
      }

      if (isToday && !isFrom && !isTo && !isInRange) {
        dayClasses += ' text-[#1c398e] font-semibold border border-[#1c398e]/50';
      }
      
      if(isInRange) {
        if(isFrom || dayDate.getDay() === 0) wrapperClasses += ' rounded-l-full';
        if(isTo || dayDate.getDay() === 6) wrapperClasses += ' rounded-r-full';
      }
      
      if(isFrom && toDate) wrapperClasses += ' rounded-l-full';
      if(isTo) wrapperClasses += ' rounded-r-full';

      days.push(
        <div key={day} className={wrapperClasses}>
            <div className={dayClasses} onClick={() => handleDateClick(day)}>
                {day}
            </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-4 w-auto sm:w-80">
        <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_RANGES.map(range => (
                <button
                    key={range.value}
                    onClick={() => handlePresetClick(range.value)}
                    className="px-2 py-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    {range.label}
                </button>
            ))}
        </div>
        <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-200">
            <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-slate-100"><ChevronLeftIcon className="h-5 w-5"/></button>
            <div className="font-semibold">{`${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`}</div>
            <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-slate-100"><ChevronRightIcon className="h-5 w-5"/></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1">
            {DAY_NAMES.map(day => <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">{day}</div>)}
            {renderDays()}
        </div>
    </div>
  );
};