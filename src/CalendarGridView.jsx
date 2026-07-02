import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react'; 

export default function CalendarGridView({ theme, tasks, setTasks, triggerToast }) {
  // New Array State for Multiple Selected Dates
  const [selectedDates, setSelectedDates] = useState([]);
  const [lastSelectedDate, setLastSelectedDate] = useState(null);
  
  // Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskCategory, setTaskCategory] = useState('');
  const [taskTime, setTaskTime] = useState('12:00');

  // Actual Today for comparison
  const todayInstance = new Date();
  const todayStr = `${todayInstance.getFullYear()}-${String(todayInstance.getMonth() + 1).padStart(2, '0')}-${String(todayInstance.getDate()).padStart(2, '0')}`;
  
  // Dynamic Date Calculations
  const viewingYear = currentDate.getFullYear();
  const viewingMonth = currentDate.getMonth(); 
  
  const currentMonthPrefix = `${viewingYear}-${(viewingMonth + 1).toString().padStart(2, '0')}-`;
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(viewingYear, viewingMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const firstDayOfMonth = new Date(viewingYear, viewingMonth, 1).getDay();
  const startingEmptySlots = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const blanks = Array.from({ length: startingEmptySlots }, (_, i) => i);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewingYear, viewingMonth - 1, 1));
    setSelectedDates([]); 
    setLastSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(viewingYear, viewingMonth + 1, 1));
    setSelectedDates([]);
    setLastSelectedDate(null);
  };

  const getDatesInRange = (startStr, endStr) => {
    const dates = [];
    const startDate = new Date(startStr);
    const endDate = new Date(endStr);
    let current = startDate <= endDate ? startDate : endDate;
    const last = startDate <= endDate ? endDate : startDate;

    while (current <= last) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      // Only include dates >= today
      if (dateStr >= todayStr) dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleDateClick = (e, formattedDate) => {
    // MODIFICATION: Block selection if date is in the past
    if (formattedDate < todayStr) {
      triggerToast("Past Date", "You cannot assign tasks to past dates.", "Info");
      return;
    }

    if (e.shiftKey && lastSelectedDate) {
      const range = getDatesInRange(lastSelectedDate, formattedDate);
      setSelectedDates(range);
    } else if (e.ctrlKey || e.metaKey) {
      if (selectedDates.includes(formattedDate)) {
        setSelectedDates(selectedDates.filter(d => d !== formattedDate));
      } else {
        setSelectedDates([...selectedDates, formattedDate]);
      }
      setLastSelectedDate(formattedDate);
    } else {
      setSelectedDates([formattedDate]);
      setLastSelectedDate(formattedDate);
    }
  };

  // 1. Add 'async' to the function signature
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || selectedDates.length === 0) return;
  
    const currentUid = localStorage.getItem('lifeflow_user_id') || localStorage.getItem('user_id');
    const fallbackCategory = taskCategory.trim() || "Inbox";
  
    try {
      const freshTasksToCommit = [];
  
      for (const executionDate of selectedDates) {
        const taskPayload = {
          title: taskTitle.trim(),
          date: executionDate,
          time: taskTime,
          priority: taskPriority,
          category: fallbackCategory
        };
  
        const res = await fetch(`http://127.0.0.1:8000/tasks/${currentUid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskPayload)
        });
  
        if (res.ok) {
          const feedback = await res.json();
          freshTasksToCommit.push({
            id: feedback.task_id,
            ...taskPayload,
            completed: false
          });
        }
      }
  
      setTasks(prev => [...freshTasksToCommit, ...prev]);
      triggerToast("System Update", "Selected calendar instances locked to database storage.");
      setTaskTitle('');
      setSelectedDates([]);
    } catch (error) {
      console.error("Network communication failure:", error);
      triggerToast("Error", "Could not sync tasks to database", "alarm");
    }
  }; 

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalName.trim() || !goalDate) return;
  
    const currentUid = localStorage.getItem('lifeflow_user_id') || localStorage.getItem('user_id');
    const targetPayload = { title: goalName.trim(), category: goalCat, targetDate: goalDate };
  
    try {
      const res = await fetch(`http://127.0.0.1:8000/goals/${currentUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetPayload)
      });
  
      if (res.ok) {
        const data = await res.json();
        setGoals(prev => [{
          id: data.goal_id,
          ...targetPayload,
          progress: 0,
          milestones: []
        }, ...prev]);
        
        setGoalName('');
        setGoalDate('');
        triggerToast("Success", "Target goal committed securely.");
      }
    } catch (err) {
      console.error("Strategic sync pipeline processing dropped:", err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">Calendar Planner Matrix</h2>
          <p className="text-xs text-slate-400">Past dates are view-only. Use <strong className="text-emerald-400">Shift+Click</strong> for future multi-date scheduling.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#0b1322] border border-slate-800 rounded-xl p-1.5 shadow-lg">
          <button onClick={handlePrevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div className="w-32 text-center"><span className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">{monthName} {viewingYear}</span></div>
          <button onClick={handleNextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {selectedDates.length > 0 && (
        <form onSubmit={handleAddTask} className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.02] space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Scheduling for: {selectedDates.length === 1 ? selectedDates[0] : `${selectedDates.length} Future Days`}
            </h3>
            <button type="button" onClick={() => { setSelectedDates([]); setLastSelectedDate(null); }} className="text-[10px] text-slate-400 hover:text-white">CANCEL</button>
          </div>
          <div className="flex flex-col gap-3">
            <input type="text" placeholder={`What objective needs to be completed?`} className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-none text-slate-100" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <select className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                <option value="high">🛑 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">☕ Low Priority</option>
              </select>
              <input type="text" placeholder="Custom Category" className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)} required />
              <input type="time" className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} />
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold px-4 rounded-xl shadow-lg shadow-emerald-500/20">Lock Task</button>
            </div>
          </div>
        </form>
      )}

      <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {weekdays.map(wd => <span key={wd} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">{wd}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-2 min-h-96">
          {blanks.map(blank => <div key={`blank-${blank}`} className="p-2.5 rounded-xl min-h-[90px] bg-transparent"></div>)}
          {daysArray.map(dayNum => {
            const formattedDate = `${currentMonthPrefix}${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const matchedTasks = tasks.filter(t => t.date === formattedDate);
            const isSelected = selectedDates.includes(formattedDate);
            const isPast = formattedDate < todayStr;

            return (
              <div 
                key={dayNum}
                onClick={(e) => handleDateClick(e, formattedDate)}
                className={`p-2.5 rounded-xl border min-h-[90px] flex flex-col justify-between transition-all select-none ${isPast ? 'opacity-50 cursor-default' : 'cursor-pointer hover:border-emerald-500/50'} ${
                  isSelected
                    ? 'border-emerald-500 ring-1 ring-emerald-500/50 bg-[#0c1220]'
                    : formattedDate === todayStr 
                    ? 'border-emerald-500/30 bg-emerald-500/[0.05] text-slate-100' 
                    : 'border-slate-800/60 bg-[#080d16]/80'
                }`}
              >
                <div className="flex justify-between items-center pointer-events-none">
                  <span className={`text-[10px] font-bold font-mono ${isSelected || formattedDate === todayStr ? 'text-emerald-400' : ''}`}>{dayNum}</span>
                  {matchedTasks.length > 0 && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                </div>
                <div className="space-y-1 mt-2 pointer-events-none">
                  {matchedTasks.slice(0, 2).map(task => (
                    <p key={task.id} className="text-[8px] font-semibold truncate bg-slate-800 px-1 py-0.5 rounded border border-slate-700 max-w-[90px] text-slate-300">
                      {task.title}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}