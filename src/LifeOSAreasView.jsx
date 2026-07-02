import React, { useState, useEffect } from 'react';

export default function LifeOSAreasView({ tasks, setTasks, habits, setHabits, handleHabitToggle }) {
  const [lifeAreas, setLifeAreas] = useState([
    { id: 'career', name: 'Career', score: 0, status: 'Pending', lastActive: 'Never', color: 'border-blue-500/30' },
    { id: 'education', name: 'Education', score: 0, status: 'Pending', lastActive: 'Never', color: 'border-purple-500/30' },
    { id: 'health', name: 'Health', score: 0, status: 'Pending', lastActive: 'Never', color: 'border-emerald-500/30' },
  ]);

  const [inputValues, setInputValues] = useState({
    Career: { text: '', priority: 'medium', time: '12:00', isRoutine: false },
    Education: { text: '', priority: 'medium', time: '12:00', isRoutine: false },
    Health: { text: '', priority: 'medium', time: '12:00', isRoutine: false },
  });

  const handleAreaSubmit = async (e, category) => {
    e.preventDefault();
    const currentInput = inputValues[category];
    if (!currentInput.text.trim()) return;
  
    const currentUserId = localStorage.getItem('lifeflow_user_id');
    const todayStr = new Date().toISOString().split('T')[0];
  
    try {
      // 1. If it's labeled a routine, save it to the Habits table in the DB
      if (currentInput.isRoutine) {
        const habitPayload = {
          name: currentInput.text,
          category: category,
          targetTime: currentInput.time
        };
  
        const habitResponse = await fetch(`http://127.0.0.1:8000/habits/${currentUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(habitPayload)
        });
  
        if (habitResponse.ok) {
          const habitData = await habitResponse.json();
          setHabits(prev => [...prev, {
            id: habitData.habit_id,
            ...habitPayload,
            missedStreak: false,
            completedDates: []
          }]);
        }
      }
  
      // 2. Always create a task instance inside the Tasks table in the DB
      const taskPayload = {
        title: currentInput.text,
        date: todayStr,
        time: currentInput.time,
        priority: currentInput.priority,
        category: category
      };
  
      const taskResponse = await fetch(`http://127.0.0.1:8000/tasks/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskPayload)
      });
  
      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTasks(prev => [{
          id: taskData.task_id,
          ...taskPayload,
          completed: false
        }, ...prev]);
      }
  
      // Reset local inputs
      setInputValues(prev => ({
        ...prev,
        [category]: { text: '', priority: 'medium', time: '12:00', isRoutine: false }
      }));
  
    } catch (err) {
      console.error("Failed to commit LifeOS Area item to the database:", err);
    }
  };

  const recalculateMetrics = (currentTasks) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedAreas = lifeAreas.map((area) => {
      const categoryTasks = currentTasks.filter((t) => t.category === area.name);
      if (categoryTasks.length === 0) return { ...area, score: 0, status: 'Pending' };
      const completedCount = categoryTasks.filter((t) => t.completed).length;
      const score = Math.round((completedCount / categoryTasks.length) * 100);
      let status = 'Pending';
      if (score > 0 && score < 100) status = 'Active';
      if (score === 100) status = 'Complete';
      return { ...area, score, status, lastActive: timestamp };
    });
    setLifeAreas(updatedAreas);
  };

  useEffect(() => {
    recalculateMetrics(tasks);
  }, [tasks]);

  const handleToggleTask = (taskId) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
  };

  const handleAddTask = async (e, category) => {
    e.preventDefault();
    const config = inputValues[category];
    if (!config.text.trim()) return;

    const currentUserId = localStorage.getItem('lifeflow_user_id') || localStorage.getItem('user_id');
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      if (config.isRoutine) {
        const habitPayload = { name: config.text, category: category, targetTime: config.time };
        const habitRes = await fetch(`http://127.0.0.1:8000/habits/${currentUserId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(habitPayload)
        });
        if (habitRes.ok) {
          const data = await habitRes.json();
          setHabits(prev => [...prev, { id: data.habit_id, ...habitPayload, missedStreak: false, completedDates: [] }]);
        }
      }

      const taskPayload = { title: config.text, date: todayStr, time: config.time, priority: config.priority, category: category };
      const taskRes = await fetch(`http://127.0.0.1:8000/tasks/${currentUserId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskPayload)
      });
      if (taskRes.ok) {
        const data = await taskRes.json();
        setTasks(prev => [...prev, { id: data.task_id, ...taskPayload, completed: false }]);
      }

      setInputValues(prev => ({ ...prev, [category]: { text: '', priority: 'medium', time: '12:00', isRoutine: false } }));
    } catch (err) {
      console.error("Failed to commit item:", err);
    }
  };

  // Helper to map images to categories
  const getCategoryIcon = (category) => {
    switch(category) {
      // You can reference them directly starting with /
      case 'Career': return <img src="/image_ea1d5f.png" alt="Career" className="w-5 h-5 opacity-80" />;
      case 'Education': return <img src="/image_ea1d97.png" alt="Education" className="w-5 h-5 opacity-80" />;
      case 'Health': return <img src="/image_ea1db9.png" alt="Health" className="w-5 h-5 opacity-80" />;
      default: return null;
    }
  };

  const systemCategories = ['Career', 'Education', 'Health'];

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-100 p-6 md:p-10 space-y-12">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">Life Balance OS Dashboard</h2>
          <p className="text-xs text-slate-400">Monitor active areas of focus and keep track of goals</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lifeAreas.map((area, idx) => (
             <div key={idx} className="p-5 rounded-2xl border border-slate-800/80 bg-[#0b1322] space-y-4 shadow-xl">
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                   <div className={`w-9 h-9 rounded-xl flex items-center justify-center border bg-slate-900/60 ${area.color}`}>
                     {getCategoryIcon(area.name)}
                   </div>
                   <div>
                     <h3 className="font-extrabold text-xs text-slate-100">{area.name}</h3>
                     <p className="text-[10px] text-slate-500">Last active {area.lastActive}</p>
                   </div>
                 </div>
                 <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${area.status === 'Pending' ? 'bg-slate-800' : 'bg-emerald-500/10'}`}>{area.status.toUpperCase()}</span>
               </div>
               <div className="space-y-1.5">
                 <div className="flex justify-between text-xs"><span className="text-slate-400">Balance Matrix Score</span><span className="font-mono font-bold text-slate-200">{area.score}%</span></div>
                 <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${area.score}%` }} /></div>
               </div>
             </div>
          ))}
        </div>
      </div>

      <hr className="border-slate-800/60" />

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCategories.map((category) => (
            <div key={category} className="p-4 bg-[#0b1322]/40 rounded-xl border border-slate-800/50 flex flex-col min-h-[350px]">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider border-b border-slate-800/80 pb-2">{category} Engine</h4>
              
              <ul className="flex-1 space-y-2 overflow-y-auto pr-1 mt-2">
                {habits.filter(h => h.category === category).map((habit) => (
                   <li key={habit.id} className="flex items-center gap-3 text-xs bg-emerald-900/10 p-2.5 rounded-lg border border-emerald-900/30">
                      <span className="text-[9px] text-emerald-500 font-bold uppercase">Routine</span>
                      <span className="flex-1 text-emerald-200">{habit.name}</span>
                      <input type="checkbox" onChange={() => handleHabitToggle(habit.id)} className="w-4 h-4 cursor-pointer" />
                   </li>
                ))}
                
                {tasks.filter((t) => t.category === category).map((task) => (
                  <li key={task.id} className="flex items-start gap-3 text-xs bg-slate-900/30 p-2.5 rounded-lg border border-slate-800/40">
                    <input type="checkbox" checked={task.completed} onChange={() => handleToggleTask(task.id)} className="w-4 h-4 cursor-pointer" />
                    <div className="flex-1">
                      <span className={`block ${task.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>{task.title}</span>
                      <span className="text-[9px] text-slate-500 mt-1 block">{task.time} • {task.priority.toUpperCase()}</span>
                    </div>
                  </li>
                ))}
              </ul>

              <form onSubmit={(e) => handleAddTask(e, category)} className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <input type="text" value={inputValues[category].text} onChange={(e) => setInputValues({...inputValues, [category]: {...inputValues[category], text: e.target.value}})} placeholder="Task..." className="w-full bg-slate-950/60 text-xs border border-slate-800 text-slate-300 rounded-lg px-3 py-2" />
                
                <div className="flex gap-2">
                  <select className="bg-slate-950 text-[10px] text-slate-400 border border-slate-800 rounded p-1" onChange={(e) => setInputValues({...inputValues, [category]: {...inputValues[category], priority: e.target.value}})}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                  {/* Updated Time Input for native 00:00 selector */}
                  <input type="time" value={inputValues[category].time} className="bg-slate-950 text-[10px] text-slate-400 border border-slate-800 rounded p-1 flex-1" onChange={(e) => setInputValues({ ...inputValues, [category]: { ...inputValues[category], time: e.target.value } })} />
                </div>
                
                <div className="flex justify-between items-center text-[10px]">
                  <label className="flex items-center gap-2 text-slate-400">
                    <input type="checkbox" checked={inputValues[category].isRoutine} onChange={(e) => setInputValues({...inputValues, [category]: {...inputValues[category], isRoutine: e.target.checked}})} />
                    Make it routine
                  </label>
                  {/* Slightly bigger + Add button */}
                  <button type="submit" className="text-emerald-400 font-bold px-4 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
                    + Add
                  </button>
                </div>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}