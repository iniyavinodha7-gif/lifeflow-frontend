import React, { useState } from 'react';
import { CheckCircle, Circle, Plus } from 'lucide-react';

export function GoalsRoadmapView({ theme, goals, setGoals, triggerToast }) {
  const [goalName, setGoalName] = useState('');
  const [goalCat, setGoalCat] = useState('Career');
  const [goalDate, setGoalDate] = useState('');
  
  // State to hold the temporary milestone inputs for each specific goal
  const [milestoneInputs, setMilestoneInputs] = useState({});

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalName.trim() || !goalDate) {
      triggerToast("Missing Fields", "Please provide a goal name and a target date.", "Error");
      return;
    }
    
    const currentUserId = localStorage.getItem('lifeflow_user_id') || localStorage.getItem('user_id');
    const payload = { title: goalName, category: goalCat, targetDate: goalDate };
  
    try {
      const response = await fetch(`http://127.0.0.1:8000/goals/${currentUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      if (response.ok) {
        const data = await response.json();
        setGoals(prev => [{
          id: data.goal_id,
          ...payload,
          progress: 0,
          milestones: []
        }, ...prev]);
        triggerToast("Goal Created", `"${goalName}" saved to database.`);
        setGoalName('');
        setGoalDate('');
      }
    } catch (err) {
      console.error("Could not write goal to cloud storage:", err);
    }
  };

  const handleAddMilestone = async (goalId) => {
    const input = milestoneInputs[goalId];
    if (!input || !input.text.trim() || !input.date) {
      triggerToast("Missing Fields", "Milestone checkpoint requirements unmet.", "Error");
      return;
    }
  
    const payload = { text: input.text, date: input.date };
  
    try {
      const response = await fetch(`http://127.0.0.1:8000/goals/${goalId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
  
      if (response.ok) {
        const data = await response.json();
        setGoals(prev => prev.map(g => {
          if (g.id === goalId) {
            return { ...g, milestones: [...g.milestones, { id: data.milestone_id, ...payload, completed: false }] };
          }
          return g;
        }));
        setMilestoneInputs(prev => ({ ...prev, [goalId]: { text: '', date: '' } }));
        triggerToast("Milestone Added", "Checkpoint attached successfully.");
      }
    } catch (err) {
      console.error("Error creating target milestone:", err);
    }
  };

  const toggleMilestone = (goalId, milestoneId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedMilestones = g.milestones.map(m => {
          if (m.id === milestoneId) return { ...m, completed: !m.completed };
          return m;
        });
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const nextProgress = Math.round((completedCount / updatedMilestones.length) * 100);
        return { ...g, milestones: updatedMilestones, progress: nextProgress };
      }
      return g;
    }));
  };

  const updateMilestoneInput = (goalId, field, value) => {
    setMilestoneInputs(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Goal-to-Task Decomposition Matrix</h2>
        <p className="text-xs text-slate-400">Map out major visions and break them down into self-defined milestones</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core roadmaps column */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Goal Creation Form */}
          <form onSubmit={handleGoalSubmit} className="p-4 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text" 
                placeholder="Ex: Learn concurrent Rust, Secure consultancy contract..."
                className="flex-1 bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none text-slate-100"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
              <div className="flex gap-2 flex-wrap md:flex-nowrap">
                <input 
                  type="date"
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  required
                />
                <select 
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
                  value={goalCat}
                  onChange={(e) => setGoalCat(e.target.value)}
                >
                  <option value="Career">Career</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance</option>
                  <option value="Personal Growth">Personal Growth</option>
                </select>
                <button 
                  type="submit" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold px-4 rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Goal
                </button>
              </div>
            </div>
          </form>

          {/* Active Goals Stream */}
          <div className="space-y-4">
            {goals.length === 0 ? (
               <div className="py-12 text-center text-slate-500 text-xs">No active goals. Type a vision above to start mapping.</div>
            ) : (
                goals.map(g => (
                <div key={g.id} className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                          <h3 className="font-extrabold text-sm tracking-tight text-white">{g.title}</h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider font-mono">{g.category}</span>
                            <span className="text-[9px] text-slate-500 font-mono">Target Date: {g.targetDate}</span>
                          </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{g.progress}% Complete</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${g.progress}%` }} />
                    </div>

                    {/* Milestones Rendering */}
                    <div className="space-y-2.5 pt-2 border-t dark:border-slate-800/60">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Milestones Stream</span>
                      
                      {g.milestones.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic">No milestones added yet.</p>
                      ) : (
                        g.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex justify-between items-center gap-3">
                              <div className="flex items-center gap-3">
                                <button onClick={() => toggleMilestone(g.id, milestone.id)}>
                                    {milestone.completed ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-600 hover:text-slate-300" />
                                    )}
                                </button>
                                <span className={`text-xs ${milestone.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                  {milestone.text}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 bg-[#080d16] px-2 py-1 rounded">
                                {milestone.date}
                              </span>
                            </div>
                        ))
                      )}
                    </div>

                    {/* Add User-Defined Milestone Field */}
                    <div className="flex gap-2 pt-3 border-t dark:border-slate-800/40">
                      <input 
                        type="text"
                        placeholder="Define a new milestone..."
                        className="flex-1 bg-[#080d16] border dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] outline-none text-slate-200"
                        value={milestoneInputs[g.id]?.text || ''}
                        onChange={(e) => updateMilestoneInput(g.id, 'text', e.target.value)}
                      />
                      <input 
                        type="date"
                        className="bg-[#080d16] border dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] outline-none text-slate-400 w-28 md:w-32"
                        value={milestoneInputs[g.id]?.date || ''}
                        onChange={(e) => updateMilestoneInput(g.id, 'date', e.target.value)}
                      />
                      <button 
                        onClick={() => handleAddMilestone(g.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 rounded-lg transition-colors"
                      >
                        Add Milestone
                      </button>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>

        {/* Goal analytics panel */}
        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Cognitive Goal Analysis</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deconstructed milestones can be integrated into daily task lists.
            Setting clear targets helps structure focus sessions and tracks work accuracy over time. Add as many checkpoints as you need per goal to maintain steady progress.
          </p>
        </div>

      </div>
    </div>
  );
}