import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import LifeOSAreasView from './LifeOSAreasView';
import CalendarGridView from './CalendarGridView';
import { 
  CheckCircle, Circle, Plus, Calendar, Clock, Award, Compass, 
  BarChart2, Zap, Brain, MessageSquare, Flame, CheckSquare, 
  ChevronRight, Play, Square, RefreshCw, Layers, Sliders, 
  Settings, Search, Bell, BellRing, Sparkles, Smile, Sun, Moon, ArrowRight,
  TrendingUp, Activity, Check, ChevronDown, User, Volume2, Mic, Trash2, Edit2, AlertCircle, Eye,
  Heart, Shield, Users, SlidersHorizontal, Briefcase, GraduationCap, DollarSign, CalendarRange,
  Lock, Database, Code, Copy, ExternalLink, X, Cloud, LogOut
} from 'lucide-react';

import AuthPage from './AuthPage';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('lifeflow_auth_token');
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Secure, production-ready non-streaming prompt handler with exponential backoff.
async function callGemini(userPrompt, systemPrompt = "", isJson = false) {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    }
  };

  if (isJson) {
    payload.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  let delay = 1000;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  return "";
}

// Separate Component for Habit Streak Label
function HabitStreakLabel({ completedDates }) {
  const streakCount = useMemo(() => {
    if (!completedDates || completedDates.length === 0) return 0;
    
    const uniqueDates = Array.from(new Set(completedDates)).sort((a, b) => new Date(b) - new Date(a));
    const todayStr = new Date().toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If target was missed both today and yesterday, streak is broken
    if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
      return 0;
    }

    let continuousStreak = 0;
    let checkDate = uniqueDates.includes(todayStr) ? new Date() : yesterday;

    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(checkStr)) {
        continuousStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return continuousStreak;
  }, [completedDates]);

  return (
    <span className="text-[10px] bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded-lg font-mono font-bold tracking-tight inline-flex items-center gap-1">
      <Flame className="w-2.5 h-2.5 text-orange-500" />
      Habit Streaks: {streakCount}
    </span>
  );
}

// Updated to use local time to perfectly sync Calendar and My Day views
const getTodayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_TASKS = [];
const INITIAL_HABITS = [];
const INITIAL_GOALS = [];

const INITIAL_AREAS = [
  { name: 'Career', score: 0, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: Briefcase },
  { name: 'Health', score: 0, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: Heart },
  { name: 'Education', score: 0, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: GraduationCap },
  { name: 'Finance', score: 0, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: DollarSign },
  { name: 'Family', score: 0, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: Users },
  { name: 'Personal Growth', score: 0, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', lastActive: 'Never', status: 'Pending', taskCount: 0, icon: Brain }
];

function LifeFlow() {
  const navigate = useNavigate();
  
  const userName = localStorage.getItem('lifeflow_user_name') || 'Guest User';
  const userRole = localStorage.getItem('lifeflow_user_role') || 'Standard';
  const userInitials = userName.substring(0, 2).toUpperCase();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeCommandPalette, setActiveCommandPalette] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState('dark');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [habits, setHabits] = useState(INITIAL_HABITS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [lifeAreas, setLifeAreas] = useState(INITIAL_AREAS);
  const [mood, setMood] = useState('Normal'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [loginStreak, setLoginStreak] = useState(0);

  // Notification Dropdown State & Refs
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef(null);

  // References to keep state fresh inside intervals without triggering loops
  const tasksRef = useRef(tasks);
  const habitsRef = useRef(habits);
  const toastTimers = useRef(new Map());

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { habitsRef.current = habits; }, [habits]);

  useEffect(() => {
    const todayStr = getTodayStr();
    const lastLoginStr = localStorage.getItem('lifeflow_last_login_date');
    let savedStreak = parseInt(localStorage.getItem('lifeflow_login_streak') || '0', 10);

    if (!lastLoginStr) {
      savedStreak = 1;
      localStorage.setItem('lifeflow_last_login_date', todayStr);
      localStorage.setItem('lifeflow_login_streak', '1');
    } else if (lastLoginStr !== todayStr) {
      const lastLoginDate = new Date(lastLoginStr);
      const todayDate = new Date(todayStr);
      const diffTime = Math.abs(todayDate - lastLoginDate);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        savedStreak += 1;
      } else if (diffDays > 1) {
        savedStreak = 1;
      }
      localStorage.setItem('lifeflow_last_login_date', todayStr);
      localStorage.setItem('lifeflow_login_streak', savedStreak.toString());
    }
    setLoginStreak(savedStreak);
  }, []);


  const userId = localStorage.getItem('lifeflow_user_id') || localStorage.getItem('user_id');

  useEffect(() => {
    if (!userId) return;
    
    const synchronizeCloudStorage = async () => {
      try {
        const taskRes = await fetch(`https://lifeflow-backend-1.onrender.com/tasks/${userId}`);
        if (taskRes.ok) {
          const data = await taskRes.json();
          setTasks(data.tasks || []);
        }
  
        const habitRes = await fetch(`https://lifeflow-backend-1.onrender.com/${userId}`);
        if (habitRes.ok) {
          const data = await habitRes.json();
          setHabits(data.habits || []);
        }
  
        const goalRes = await fetch(`https://lifeflow-backend-1.onrender.com/${userId}`);
        if (goalRes.ok) {
          const data = await goalRes.json();
          setGoals(data.goals || []);
        }
      } catch (err) {
        console.error("Failed application hydration:", err);
      }
    };
  
    synchronizeCloudStorage();
  }, [userId]);

  // Handle clicking outside the notification panel to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lifeflow_auth_token');
    localStorage.removeItem('lifeflow_user_name');
    localStorage.removeItem('lifeflow_user_role');
    navigate('/auth');
  };

  const [scheduleInputs, setScheduleInputs] = useState({
    workHours: '9:00 - 17:00',
    gymTime: '18:00 - 19:30',
    deadlines: 'Midnight Review',
    energyLevel: 'Normal'
  });
  
  const [generatedSchedule, setGeneratedSchedule] = useState([]);
  const [generatingSchedule, setGeneratingSchedule] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  const [nlpParsing, setNlpParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [focusTime, setFocusTime] = useState(1500);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusCategory, setFocusCategory] = useState('Coding');
  const [recordedMinutes, setRecordedMinutes] = useState(0);
  const [selectedAmbient, setSelectedAmbient] = useState('Forest Rain Loop');

  const [integrationSwitches, setIntegrationSwitches] = useState({
    gmail: false,
    calendar: false,
    drive: false,
    meet: false
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Robust notification trigger with rigorous cleanup
  const triggerToast = (title, message = "", type = "Success", duration = 10000) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    setToasts(prev => [...prev, { id, title, message, type }]);

    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimers.current.delete(id);
    }, duration);

    toastTimers.current.set(id, timer);
  };

  // Ensure timers are purged on unmount
  useEffect(() => {
    return () => {
      toastTimers.current.forEach(timer => clearTimeout(timer));
      toastTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (focusRunning && focusTime > 0) {
      interval = setInterval(() => {
        setFocusTime(prev => prev - 1);
      }, 1000);
    } else if (focusTime === 0 && focusRunning) {
      setFocusRunning(false);
      setRecordedMinutes(prev => prev + 25);
      triggerToast("🎯 Focus Block Complete!", "Added 25 minutes of highly focused deep work.");
      setFocusTime(1500);
    }
    return () => clearInterval(interval);
  }, [focusRunning, focusTime]);

  // Fixed Notification Logic Loop 
  useEffect(() => {
    const checkTaskTimes = setInterval(() => {
      const now = new Date();
      const currentHoursMinutes = now.toTimeString().slice(0, 5); 

      const in10Min = new Date(now.getTime() + 10 * 60 * 1000);
      const in10MinHHMM = in10Min.toTimeString().slice(0, 5);

      let habitUpdates = {};
      habitsRef.current.forEach(habit => {
        if (habit.targetTime === in10MinHHMM && !habit.hasReminderFired) {
          triggerToast("Habit Reminder", `REMINDER: ${habit.name} needs to be completed in 10 minutes.`, "info", 10000);
          habitUpdates[habit.id] = { hasReminderFired: true };
        }
        if (habit.targetTime === currentHoursMinutes && !habit.hasDeadlineFired) {
          const alarmAudio = new Audio('/alarm-sound.mp3');
          alarmAudio.play().catch(err => console.error("Audio blocked:", err));
          triggerToast("Routine Alert", `complete the routine: ${habit.name}`, "alarm", 10000);
          habitUpdates[habit.id] = { ...habitUpdates[habit.id], hasDeadlineFired: true };
        }
      });

      if (Object.keys(habitUpdates).length > 0) {
        setHabits(prev => prev.map(h => habitUpdates[h.id] ? { ...h, ...habitUpdates[h.id] } : h));
      }

      let taskUpdates = {};
      tasksRef.current.forEach(task => {
        if (task.completed || !task.time) return;

        if (task.time === in10MinHHMM && !task.hasReminderFired) {
          triggerToast("Task Reminder", `REMINDER: ${task.title} needs to be completed in 10 minutes.`, "info", 10000);
          taskUpdates[task.id] = { hasReminderFired: true };
        }
        if (task.time === currentHoursMinutes && !task.hasDeadlineFired) {
          triggerToast("Task Deadline", `The completion time of this task has arrived: ${task.title}`, "info", 10000);
          taskUpdates[task.id] = { ...taskUpdates[task.id], hasDeadlineFired: true };
        }
      });

      if (Object.keys(taskUpdates).length > 0) {
        setTasks(prev => prev.map(t => taskUpdates[t.id] ? { ...t, ...taskUpdates[t.id] } : t));
      }

    }, 10000);

    return () => clearInterval(checkTaskTimes);
  }, []); 

  const processLiveNlpHeuristics = (input) => {
    if (!input.trim()) {
      setParsedPreview(null);
      return;
    }
    const val = input.toLowerCase();
    const preview = {
      title: input,
      date: 'Today',
      time: '12:00',
      priority: 'medium',
      category: 'Inbox',
      isRecurring: false
    };

    if (val.includes('tomorrow')) preview.date = 'Tomorrow';
    else if (val.includes('friday')) preview.date = 'Friday';
    else if (val.includes('monday')) preview.date = 'Monday';

    if (val.includes('every day') || val.includes('every week') || val.includes('monthly')) {
      preview.isRecurring = true;
    }

    if (val.includes('high priority') || val.includes('!!!') || val.includes('urgent')) {
      preview.priority = 'high';
    } else if (val.includes('low priority') || val.includes('easy')) {
      preview.priority = 'low';
    }

    const matchedCat = ['Career', 'Health', 'Education', 'Finance', 'Personal Growth', 'Family'].find(
      cat => val.includes(cat.toLowerCase())
    );

    if (matchedCat) preview.category = matchedCat;

    setParsedPreview(preview);
  };
  
  const handleSmartTaskSubmit = async (e) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;
    setNlpParsing(true);

    let finalTask = {
      id: 'task_' + Date.now(),
      title: nlpInput,
      date: getTodayStr(),
      time: '12:00',
      priority: 'medium',
      category: 'Inbox',
      completed: false,
      hasReminderFired: false,
      hasDeadlineFired: false,
      subtasks: []
    };

    try {
      const systemPrompt = `You are LifeFlow AI's natural language productivity engine. Extract parameters relative to today (${getTodayStr()}). JSON format only.`;
      const response = await callGemini(`Parse task input: "${nlpInput}"`, systemPrompt, true);

      if (response) {
        const data = JSON.parse(response);
        finalTask = {
          ...finalTask,
          title: data.title || finalTask.title,
          date: data.date || finalTask.date,
          time: data.time || finalTask.time,
          priority: data.priority || finalTask.priority,
          category: data.category || finalTask.category,
          subtasks: data.subtasks || []
        };
      }
    } catch (error) {
      if (parsedPreview) {
        const offsetDateStr = (days) => {
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d.toISOString().split('T')[0];
        };

        finalTask = {
          ...finalTask,
          title: parsedPreview.title,
          date: parsedPreview.date === 'Today' ? getTodayStr() : parsedPreview.date === 'Tomorrow' ? offsetDateStr(1) : offsetDateStr(2),
          priority: parsedPreview.priority,
          category: parsedPreview.category
        };
      }
    }

    setTasks(prev => [finalTask, ...prev]);
    triggerToast("Task Created", `"${finalTask.title}" allocated to ${finalTask.category}`);
    setNlpInput('');
    setParsedPreview(null);
    setNlpParsing(false);
  };

  const toggleTask = async (id) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;
    
    const nextState = !taskToUpdate.completed;
    
    // Side Effect Isolated from State Updater to fix StrictMode double-firing
    if (nextState) {
        triggerToast("🚀 Daily Flow Upgraded!", "+10 productivity score coordinates registered.", "Success", 10000);
    }

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, completed: nextState };
      }
      return t;
    }));

    try {
      await fetch(`https://lifeflow-backend-1.onrender.com/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextState })
      });
    } catch (error) {
      console.error("Failed to sync task status", error);
    }
  };

  const removeTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    triggerToast("Task Deleted", "Removed item permanently from dashboard pipeline.");

    try {
      await fetch(`https://lifeflow-backend-1.onrender.com/tasks/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleHabitToggle = async (habitId, targetDate) => {
    try {
      const response = await fetch(`https://lifeflow-backend-1.onrender.com/habits/${habitId}/toggle?date=${targetDate}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      // Update local react state depending on whether it was logged or unlogged
      setHabits(prevHabits => prevHabits.map(h => {
        if (h.id === habitId) {
          const exists = h.completedDates.includes(targetDate);
          return {
            ...h,
            completedDates: exists 
              ? h.completedDates.filter(d => d !== targetDate)
              : [...h.completedDates, targetDate]
          };
        }
        return h;
      }));
    } catch (error) {
      console.error("Could not sync habit update:", error);
    }
  };

  const moodAdaptedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (mood === 'Tired') {
        return t.priority === 'low' || t.priority === 'medium';
      }
      if (mood === 'Energetic') {
        return t.priority === 'high' || t.priority === 'medium';
      }
      return true;
    });
  }, [tasks, mood]);

  // Derived tasks for the Notification Bell
  const upcomingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.completed && t.time)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks]);

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Julien Daniels",
    role: "Core Stack Dev"
  });

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-emerald-500/35 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#080d16]' : 'bg-[#f8fafc]'
    }`}>
      
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {toasts.map(toast => {
          const isAlarm = toast.type === 'alarm';
          return (
            <div 
              key={toast.id} 
              className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 pointer-events-auto flex gap-3 transform scale-100 ${
                theme === 'dark' 
                  ? isAlarm ? 'bg-red-950/90 border-red-500/50 text-slate-100' : 'bg-[#0f172a]/95 border-emerald-500/20 text-slate-100' 
                  : isAlarm ? 'bg-red-50/95 border-red-500/50 text-slate-900' : 'bg-white/95 border-emerald-500/20 text-slate-900'
              }`}
            >
              <div className="flex-shrink-0">
                {isAlarm ? <BellRing className="w-5 h-5 text-red-400 animate-bounce" /> : <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />}
              </div>
              <div className="flex-1">
                <h4 className={`text-xs font-bold font-mono tracking-wide uppercase ${isAlarm ? 'text-red-400' : 'text-emerald-400'}`}>
                  {toast.title}
                </h4>
                {toast.message && <p className="text-[11px] text-slate-400 mt-1">{toast.message}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {activeCommandPalette && (
        <CommandPalette onClose={() => setActiveCommandPalette(false)} onSelectView={(view) => { setActiveTab(view); setActiveCommandPalette(false); }} />
      )}

      {showOnboarding && (
        <OnboardingOverlay theme={theme} onClose={() => { setShowOnboarding(false); triggerToast("Onboarding Optimized", "Personalized deep productivity matrices fully established.", "Success"); }} />
      )}

      <div className="flex min-h-screen">
        <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 flex flex-col border-r z-40 transition-all ${
          theme === 'dark' ? 'bg-[#0b1322] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="p-5 flex items-center justify-between border-b dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-white">LifeFlow AI</h1>
                <p className="text-[9px] text-emerald-400 font-mono tracking-wider uppercase font-semibold">Plan less. Achieve more.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3 block mb-2 font-mono">Workspace Views</span>
              <nav className="space-y-1">
                <SidebarItem icon={<Layers className="w-4 h-4" />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <SidebarItem icon={<Compass className="w-4 h-4" />} label="My Day" active={activeTab === 'myday'} onClick={() => setActiveTab('myday')} badge="Focus" />
                <SidebarItem icon={<CheckSquare className="w-4 h-4" />} label="Tasks Hub" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} badge={tasks.filter(t => !t.completed).length} />
                <SidebarItem icon={<CalendarRange className="w-4 h-4" />} label="Calendar Grid" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
              </nav>
            </div>

            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-3 block mb-2 font-mono">Systems</span>
              <nav className="space-y-1">
                <SidebarItem icon={<Flame className="w-4 h-4" />} label="Habits Loop" active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} badge="Routines" />
                <SidebarItem icon={<Award className="w-4 h-4" />} label="Goals Roadmap" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
                <SidebarItem icon={<Brain className="w-4 h-4" />} label="Focus Ambient" active={activeTab === 'focus'} onClick={() => setActiveTab('focus')} badge="Timer" />
                <SidebarItem icon={<Activity className="w-4 h-4" />} label="Life OS Areas" active={activeTab === 'areas'} onClick={() => setActiveTab('areas')} />
              </nav>
            </div>
          </div>

          <div className="relative p-4 border-t dark:border-slate-800">
            <div className={`absolute bottom-full left-4 right-4 mb-2 p-2 rounded-xl border shadow-xl transition-all duration-300 ease-out origin-bottom ${
              showProfileMenu ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
            } ${theme === 'dark' ? 'bg-[#0c1220] border-slate-800' : 'bg-white border-slate-200'}`}>
              <button onClick={handleLogout} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                <span>Logout System</span>
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex flex-1 items-center gap-3 hover:opacity-80 transition-opacity text-left">
                <div className="w-9 h-9 rounded-full bg-slate-800 border dark:border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 font-mono flex-shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="text-xs text-slate-400 font-bold capitalize truncate">{userName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{userRole}</p>
                </div>
              </button>
              <button onClick={() => setShowOnboarding(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex-shrink-0 ml-2" title="Reset System Onboarding">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col min-h-screen">
          <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md ${
            theme === 'dark' ? 'bg-[#080d16]/80 border-slate-800/60' : 'bg-[#f8fafc]/80 border-slate-200'
          }`}>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-80 max-w-sm hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Universal search (Press Ctrl+K)..."
                  className={`w-full pl-9 pr-4 py-1.5 rounded-xl text-xs outline-none border transition-all ${
                    theme === 'dark' ? 'bg-[#0c1220] border-slate-800 text-slate-200 focus:border-slate-700' : 'bg-white border-slate-200 text-slate-800 focus:border-slate-400'
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className={`absolute top-full left-0 mt-2 w-full rounded-xl border shadow-2xl p-2 z-50 ${
                    theme === 'dark' ? 'bg-[#0b1322] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-2">Tasks Found</div>
                    {tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <div className="p-2 text-xs text-slate-500 text-center">No matching tasks found.</div>
                    ) : (
                      tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(t => (
                        <div key={t.id} className={`p-2 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-between ${
                          theme === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                        }`} onClick={() => { setActiveTab('tasks'); setSearchQuery(''); }}>
                          <span className="truncate">{t.title}</span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono border border-emerald-500/20">{t.category}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 border dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                {['Energetic', 'Normal', 'Tired'].map(lvl => (
                  <button 
                    key={lvl}
                    onClick={() => { setMood(lvl); triggerToast(`Mood: ${lvl}`, `Optimizing tasks parameters for your energy.`, "Info"); }}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-lg transition-all ${mood === lvl ? 'bg-emerald-500 text-[#080d16]' : 'text-slate-400'}`}
                  >
                    {lvl === 'Energetic' ? '⚡ Energetic' : lvl === 'Tired' ? '🔋 Tired' : 'Balanced'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 bg-slate-900/40 border dark:border-slate-800/80 px-3 py-1 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  <span className="text-orange-500 font-bold">{loginStreak} Days</span>
                </div>
                <div className="w-px h-3 bg-slate-800" />
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300 font-bold">LVL 1</span>
                </div>
              </div>

              {/* Enhanced Notification Bell Toggle */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setShowNotifications(prev => !prev)} 
                  className={`p-2 rounded-xl border transition-colors relative ${showNotifications ? 'bg-slate-800 text-white border-slate-700' : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <Bell className="w-4 h-4" />
                  {upcomingTasks.length > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>}
                </button>

                {showNotifications && (
                  <div className={`absolute top-full right-0 mt-3 w-80 rounded-2xl border shadow-2xl p-4 z-50 animate-fadeIn ${
                    theme === 'dark' ? 'bg-[#0b1322] border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-3 border-b dark:border-slate-800/80 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Upcoming Reminders</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {upcomingTasks.length === 0 ? (
                        <div className="py-6 text-center text-slate-500 text-xs">
                          No active tasks scheduled.
                        </div>
                      ) : (
                        upcomingTasks.map(t => (
                          <div key={t.id} className="group flex justify-between items-start p-3 rounded-xl border dark:border-slate-800/80 bg-[#080d16] hover:border-slate-700 transition-all">
                            <div className="flex-1 min-w-0 pr-3 text-left">
                              <h4 className="text-xs font-bold text-slate-200 truncate">{t.title}</h4>
                              <div className="flex flex-col gap-1 mt-2 text-[10px] text-slate-500 font-mono">
                                 <span className="flex items-center gap-1">
                                   <Plus className="w-3 h-3 text-slate-600" /> Created: {t.createdAt || 'Just Now'}
                                 </span>
                                 <span className="flex items-center gap-1">
                                   <Layers className="w-3 h-3 text-slate-600" /> Category: <span className="text-emerald-400 capitalize">{t.category || 'None'}</span>
                                 </span>
                                 <span className="flex items-center gap-1 text-rose-400 font-bold">
                                   <Clock className="w-3 h-3" /> Due: {t.time || 'N/A'}
                                 </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeTask(t.id)} 
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => setActiveTab('tasks')} className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all">
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <DashboardView theme={theme} tasks={tasks} habits={habits} goals={goals} toggleTask={toggleTask} handleHabitToggle={handleHabitToggle} mood={mood} setActiveTab={setActiveTab} />
            )}

            {activeTab === 'myday' && (
              <MyDayView theme={theme} tasks={moodAdaptedTasks} habits={habits} toggleTask={toggleTask} handleHabitToggle={handleHabitToggle} mood={mood} triggerToast={triggerToast} />
            )}

            {activeTab === 'tasks' && (
              <TasksHubView theme={theme} tasks={tasks} setTasks={setTasks} toggleTask={toggleTask} triggerToast={triggerToast} removeTask={removeTask} />
            )}

            {activeTab === 'calendar' && (
              <CalendarGridView theme={theme} tasks={tasks} setTasks={setTasks} triggerToast={triggerToast} />
            )}

            {activeTab === 'habits' && (
              <HabitsLoopView theme={theme} habits={habits} setHabits={setHabits} handleHabitToggle={handleHabitToggle} triggerToast={triggerToast} />
            )}

            {activeTab === 'goals' && (
              <GoalsRoadmapView theme={theme} goals={goals} setGoals={setGoals} triggerToast={triggerToast} />
            )}

            {activeTab === 'focus' && (
              <FocusAmbientView theme={theme} focusTime={focusTime} setFocusTime={setFocusTime} focusRunning={focusRunning} setFocusRunning={setFocusRunning} focusCategory={focusCategory} setFocusCategory={setFocusCategory} recordedMinutes={recordedMinutes} selectedAmbient={selectedAmbient} setSelectedAmbient={setSelectedAmbient} />
            )}

            {activeTab === 'areas' && (
              <LifeOSAreasView theme={theme} tasks={tasks.filter(t => t.date === getTodayStr())} setTasks={setTasks} habits={habits} setHabits={setHabits} handleHabitToggle={handleHabitToggle} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all ${
      active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={active ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}>{icon}</span>
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/60 text-slate-500'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function DashboardView({ theme, tasks, habits, goals, toggleTask, handleHabitToggle, mood, setActiveTab }) {
  const todayStr = getTodayStr();
  const todayTasks = tasks.filter(t => t.date === todayStr);

  const pendingCount = todayTasks.filter(t => !t.completed).length;
  
  const flowAccuracy = useMemo(() => {
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.completed).length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [todayTasks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
      <div className="lg:col-span-2 space-y-6">
        <div className="relative overflow-hidden p-6 rounded-3xl border dark:border-slate-800 bg-gradient-to-br from-[#0c1322] to-[#080d16]">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] tracking-widest font-bold uppercase text-emerald-400 font-mono">FLOW LEVEL PARADIGM</span>
              <h2 className="text-xl font-extrabold tracking-tight text-white mt-1">Sustained Workspace Consistency</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                You have logged <strong className="text-slate-100">{pendingCount} critical action items</strong> pending today's energy blocks.
              </p>
            </div>
            
            <div className="flex items-center gap-3.5 bg-[#080d16]/80 p-3.5 rounded-2xl border dark:border-slate-800/80">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="#1e293b" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="#10b981" strokeWidth="4" 
                    strokeDasharray={2 * Math.PI * 20}
                    strokeDashoffset={2 * Math.PI * 20 * (1 - flowAccuracy / 100)}
                    className="transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-[10px] font-mono font-bold text-slate-100">{flowAccuracy}%</span>
              </div>
              <div>
                <h4 className="text-[9px] uppercase font-bold tracking-wider text-slate-500 font-mono">FLOW SCORE</h4>
                <p className="text-xs font-semibold text-slate-300">Leveling Up Sequence</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">AI PRIORITY SUGGESTION</span>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">Focus on alignment goals and initiate primary tasks based on today's energy constraints.</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('myday')} className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] font-bold text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-lg">
            Go to My Day
          </button>
        </div>

        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 font-mono">Today's Focus Core</h3>
              <p className="text-[10px] text-slate-500">Structured tasks and deadlines for {getTodayStr()}</p>
            </div>
            <button onClick={() => setActiveTab('tasks')} className="text-[10px] font-semibold text-emerald-400 hover:underline font-mono">
              See Inbox ({tasks.length})
            </button>
          </div>

          <div className="space-y-2.5">
            {todayTasks.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">No active tasks scheduled for today. Create a task to start leveling up.</div>
            ) : (
                todayTasks.slice(0, 4).map(t => <TaskCard key={t.id} task={t} onToggle={toggleTask} />)
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Consistency Streak Overview</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Level 1 Initiator</span>
              <span className="font-mono text-emerald-400 font-bold">{tasks.filter(t => t.completed).length * 10} / 500 XP</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(((tasks.filter(t => t.completed).length * 10) / 500) * 100, 100)}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-3 bg-[#080d16] rounded-xl border dark:border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-mono block">Today's Accuracy</span>
              <span className="text-xs font-bold text-slate-200">{flowAccuracy}%</span>
            </div>
            <div className="p-3 bg-[#080d16] rounded-xl border dark:border-slate-800">
              <span className="text-[9px] text-slate-500 uppercase font-mono block">All Time Completes</span>
              <span className="text-xs font-bold text-slate-200">{tasks.filter(t => t.completed).length} items</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Goal Roadmaps</h3>
            <button onClick={() => setActiveTab('goals')} className="text-[10px] text-emerald-400 hover:underline">All Goals</button>
          </div>

          <div className="space-y-2">
            {goals.length === 0 ? (
                 <div className="py-6 text-center text-slate-500 text-xs">No active goals. Set a target roadmap.</div>
            ) : (
                goals.map(g => (
                <div key={g.id} className="p-3 rounded-xl bg-[#080d16] border dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-xs">
                    <span className="font-semibold truncate max-w-[150px]">{g.title}</span>
                    <span className="font-mono text-emerald-400">{g.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${g.progress}%` }} />
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MyDayView({ theme, tasks, habits, toggleTask, handleHabitToggle, mood, triggerToast }) {
  const [morningNotes, setMorningNotes] = useState('');
  const [plannerChecked, setPlannerChecked] = useState(false);

  const todayTasks = tasks.filter(t => t.date === getTodayStr());
  
  const missedHabitAlert = useMemo(() => {
    return habits.find(h => h.missedStreak);
  }, [habits]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">My Day</h2>
          <p className="text-xs text-slate-400">Structured flow control and priority alignment for {getTodayStr()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {missedHabitAlert && (
            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest font-mono">HABIT RECOVERY MATRIX ACTIVE</h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Streak lapsed for: <strong>{missedHabitAlert.name}</strong>. Let's do a micro 15-minute reduced session today to maintain flow structure!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  handleHabitToggle(missedHabitAlert.id);
                  triggerToast("Habit Restored", "Recovery routine completed successfully. Streak protection secured.");
                }}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] uppercase px-3.5 py-1.5 rounded-lg flex-shrink-0"
              >
                Log Recovery Session
              </button>
            </div>
          )}

          <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Morning Alignment Declaration</h3>
            <textarea 
              rows="2"
              placeholder="What represents your absolute core focus directive today?"
              className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-slate-700 resize-none"
              value={morningNotes}
              onChange={(e) => setMorningNotes(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-500">Syncs to calendar notification payloads.</span>
              <button 
                onClick={() => {
                  setPlannerChecked(true);
                  triggerToast("Directives Locked", "Morning objectives successfully synchronized.");
                }}
                className="bg-emerald-500 text-[#080d16] font-bold text-[10px] uppercase px-4 py-1.5 rounded-lg"
              >
                Lock Focus Intent
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Today's Executable Blocks</h3>
            <div className="space-y-2">
              {todayTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">No active goals scheduled today matching your mood filter. Add a task or adjust mood level.</div>
              ) : (
                todayTasks.map(t => <TaskCard key={t.id} task={t} onToggle={toggleTask} />)
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="p-5 rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-[#0c1322] to-[#080d16] space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Brain className="w-4 h-4 animate-pulse" />
              <h4 className="text-xs font-bold uppercase font-mono tracking-wider">LifeFlow Smart Guard</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Based on your selected <strong className="text-emerald-300 capitalize">{mood}</strong> energy profile, the database has re-organized priority queues.
            </p>
          </div>

          <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-400 font-mono">External Integrations</span>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-mono">GCal Live</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-[#080d16] border dark:border-slate-800/60 text-xs flex justify-between items-center">
                <div className="text-slate-500 text-center py-4 w-full text-xs">No external meetings detected today.</div>
                <Cloud className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksHubView({ theme, tasks, setTasks, toggleTask, triggerToast, removeTask }) {
  const categoryFilters = useMemo(() => {
    const defaults = ['All', 'career', 'health', 'education', 'finance', 'personal growth', 'family', 'others'];
    const activeCustomCategories = tasks.map(t => t.category).filter(Boolean);
    return Array.from(new Set([...defaults, ...activeCustomCategories]));
  }, [tasks]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskCategory, setTaskCategory] = useState('career');
  const [customCategory, setCustomCategory] = useState('');
  const [completionTime, setCompletionTime] = useState('17:00');

  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'All') return tasks;
    return tasks.filter(t => t.category === selectedCategory);
  }, [tasks, selectedCategory]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const finalCategory = taskCategory === 'others' ? customCategory.trim() : taskCategory;

    const userId = localStorage.getItem('lifeflow_user_id');
    const newTaskPayload = {
      title: taskName,
      date: getTodayStr(),
      time: completionTime || '12:00',
      priority: taskPriority,
      category: finalCategory || 'General'
    };

    try {
      const response = await fetch(`https://lifeflow-backend-1.onrender.com/tasks/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskPayload)
      });
      
      const data = await response.json();
      const newTask = {
        id: data.task_id,
        ...newTaskPayload,
        completed: false,
        hasReminderFired: false,
        hasDeadlineFired: false
      };

      setTasks(prev => [newTask, ...prev]);
      triggerToast("Task Created", `"${taskName}" mapped to ${newTask.category}`);
      setTaskName('');
    } catch (error) {
      console.error("Failed to create task", error);
      triggerToast("Error", "Could not save task to database", "alarm");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Tasks & Inbox Hub</h2>
        <p className="text-xs text-slate-400">Perform direct CRUD operations, filter custom text variables, and register smart task alerts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
          {categoryFilters.map(cat => {
            const count = cat === 'All' ? tasks.length : tasks.filter(t => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full p-3 rounded-xl border text-left flex justify-between items-center text-xs font-semibold tracking-tight transition-all capitalize ${
                  selectedCategory === cat 
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold' 
                    : 'border-slate-800/80 bg-[#0b1322]/40 hover:bg-[#0b1322] text-slate-400'
                }`}
              >
                <span className="truncate mr-2">{cat}</span>
                <span className="font-mono bg-[#080d16] px-1.5 py-0.5 rounded text-[10px] shrink-0">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <form onSubmit={handleManualSubmit} className="p-4 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="What objective or milestone needs recording?"
                className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-none text-slate-100 placeholder:text-slate-600"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <select 
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="high">🛑 High Priority</option>
                  <option value="medium">⚡ Medium Priority</option>
                  <option value="low">☕ Low Priority</option>
                </select>
                
                <div className="relative">
                  <select 
                    className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                  >
                    <option value="career">Career</option>
                    <option value="health">Health</option>
                    <option value="education">Education</option>
                    <option value="finance">Finance</option>
                    <option value="personal growth">Personal Growth</option>
                    <option value="family">Family</option>
                    <option value="others">Others...</option>
                  </select>
                </div>

                <div className="relative flex items-center">
                  <Clock className="absolute left-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input 
                    type="time"
                    className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-300 outline-none"
                    value={completionTime}
                    onChange={(e) => setCompletionTime(e.target.value)}
                  />
                </div>

                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold px-4 rounded-xl transition-all">
                  Add to Inbox
                </button>
              </div>

              {taskCategory === 'others' && (
                <div className="mt-1">
                  <input 
                    type="text"
                    placeholder="Type custom category..."
                    className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                </div>
              )}
            </div>
          </form>

          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                No active tasks logged under this category filter.
              </div>
            ) : (
              filteredTasks.map(t => (
                <div key={t.id} className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-[#0b1322]/80 gap-3 hover:border-slate-700 transition-all">
                  <div className="flex items-start gap-3 flex-1">
                    <input 
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id)}
                      className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 bg-[#080d16] h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div>
                      <span className={`text-xs font-medium ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {t.title}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-mono text-slate-500">
                        <span className="px-1.5 py-0.5 rounded bg-[#080d16] text-slate-400 border border-slate-900 capitalize">
                          📁 {t.category}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-2.5 h-2.5" /> Date: {t.date} | {t.createdAt || 'Just Now'}
                        </span>
                        <span className={`capitalize font-bold ${
                          t.priority === 'high' ? 'text-rose-400' : t.priority === 'medium' ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          • {t.priority} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-mono ${
                      t.completed 
                        ? 'border-slate-800 bg-[#080d16]/30 text-slate-600' 
                        : t.hasDeadlineFired || t.hasReminderFired
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-400 animate-pulse'
                        : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
                    }`}>
                      <Bell className={`w-3 h-3 ${t.hasReminderFired && !t.completed ? 'fill-rose-400' : ''}`} />
                      <span>Complete Before: {t.time}</span>
                    </div>

                    <button 
                      onClick={() => removeTask(t.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Permanently remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HabitsLoopView({ theme, habits, setHabits, handleHabitToggle, triggerToast }) {
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCat, setNewHabitCat] = useState('Health');
  const [newHabitTime, setNewHabitTime] = useState('08:00'); 

  const createHabit = (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    
    const newH = {
      id: 'habit_' + Date.now(),
      name: newHabitTitle,
      frequency: 'Daily',
      streak: 0,
      completedDates: [],
      category: newHabitCat,
      targetTime: newHabitTime, 
      missedStreak: false,
      hasReminderFired: false,
      hasDeadlineFired: false
    };
    
    setHabits(prev => [newH, ...prev]);
    triggerToast("Habit Loop Configured", `"${newHabitTitle}" scheduled for ${newHabitTime}`);
    setNewHabitTitle('');
    setNewHabitTime('08:00'); 
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Habits Tracking Loop</h2>
        <p className="text-xs text-slate-400">Lock in behavioral patterns with scheduled time-bound reminders.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={createHabit} className="p-4 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Ex: Hydration Protocol, Review Ledger..."
                className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none text-slate-100"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
              />
              
              <div className="grid grid-cols-3 gap-2">
                <select 
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300"
                  value={newHabitCat}
                  onChange={(e) => setNewHabitCat(e.target.value)}
                >
                  <option value="Health">Health</option>
                  <option value="Career">Career</option>
                  <option value="Finance">Finance</option>
                  <option value="Personal Growth">Personal Growth</option>
                  <option value="Education">Education</option>
                  <option value="Family">Family</option>
                </select>
                
                <input 
                  type="time"
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-300 outline-none"
                  value={newHabitTime}
                  onChange={(e) => setNewHabitTime(e.target.value)}
                />
                
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold px-2 rounded-xl">
                  Register Habit
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-3">
            {habits.length === 0 ? (
               <div className="py-12 text-center text-slate-500 text-xs">No habits logged. Formulate a routine above.</div>
            ) : (
              habits.map(h => {
                const isLogged = h.completedDates.includes(getTodayStr());
                return (
                  <div key={h.id} className="p-4 rounded-2xl border dark:border-slate-800 bg-[#0b1322] flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">{h.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider font-mono">{h.category}</span>
                        <span className="text-[9px] text-emerald-500 font-mono font-bold">Target: {h.targetTime}</span>
                        
                        <HabitStreakLabel completedDates={h.completedDates} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleHabitToggle(h.id)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all ${
                          isLogged 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isLogged ? 'Log Complete' : 'Log Target'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Cognitive Consistency</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Time-bound habit tracking helps synchronize your physiological rhythm with productivity tasks. Ensure you stick to the target time to maximize dopamine stabilization.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoalsRoadmapView({ theme, goals, setGoals, triggerToast }) {
  const [goalName, setGoalName] = useState('');
  const [goalCat, setGoalCat] = useState('Career');
  const [goalDate, setGoalDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [newMilestoneText, setNewMilestoneText] = useState({});
  const [newMilestoneDate, setNewMilestoneDate] = useState({});

  const handleCreateGoal = (e) => {
    e.preventDefault();
    if (!goalName.trim()) return;
    
    const newGoal = {
      id: 'goal_' + Date.now(),
      title: goalName,
      category: goalCat,
      targetDate: goalDate,
      progress: 0,
      milestones: []
    };

    setGoals(prev => [newGoal, ...prev]);
    triggerToast("Goal Created", `"${goalName}" added to roadmap.`);
    setGoalName('');
  };

  const addMilestone = (goal) => {
    const text = newMilestoneText[goal.id];
    const date = newMilestoneDate[goal.id] || new Date().toISOString().split('T')[0];
    
    if (!text) return;

    if (date > goal.targetDate) {
        triggerToast("Invalid Date", "Milestone cannot be set after the goal's target date.");
        return;
    }
    
    const newMilestone = {
        id: Date.now(), 
        text,
        date,
        completed: false
    };

    setGoals(prev => prev.map(g => {
      if (g.id === goal.id) {
        return { ...g, milestones: [...g.milestones, newMilestone] };
      }
      return g;
    }));

    setNewMilestoneText(prev => ({ ...prev, [goal.id]: '' }));
  };

  const toggleMilestone = (goalId, milestoneId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedMilestones = g.milestones.map(m => {
          if (m.id === milestoneId) return { ...m, completed: !m.completed };
          return m;
        });
        const completedCount = updatedMilestones.filter(m => m.completed).length;
        const total = updatedMilestones.length;
        const nextProgress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return { ...g, milestones: updatedMilestones, progress: nextProgress };
      }
      return g;
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Goal-to-Task Decomposition Matrix</h2>
        <p className="text-xs text-slate-400">Set high-level visions and build your own custom milestones.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleCreateGoal} className="p-4 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-3">
            <div className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Ex: Learn concurrent Rust, Secure consultancy contract..."
                className="w-full bg-[#080d16] border dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none text-slate-100"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
              />
              <div className="flex gap-2">
                <select 
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
                  value={goalCat}
                  onChange={(e) => setGoalCat(e.target.value)}>
                  <option value="Career">Career</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance</option>
                  <option value="Personal Growth">Personal Growth</option>
                  <option value="Health">Health</option>
                  <option value="Family">Family</option>
                </select>
                <input 
                  type="date"
                  className="bg-[#080d16] border dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                />
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold px-4 rounded-xl">
                  Create Goal
                </button>
              </div>
            </div>
          </form>

          <div className="space-y-4">
            {goals.length === 0 ? (
               <div className="py-12 text-center text-slate-500 text-xs">No active goals. Add a new vision above.</div>
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

                    <div className="space-y-3 pt-2 border-t dark:border-slate-800/60">
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                placeholder="Add milestone..."
                                className="flex-1 bg-[#080d16] border dark:border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-200"
                                value={newMilestoneText[g.id] || ''}
                                onChange={(e) => setNewMilestoneText({...newMilestoneText, [g.id]: e.target.value})}
                             />
                             <input 
                                type="date"
                                className="bg-[#080d16] border dark:border-slate-800 rounded-lg px-1 py-1 text-[10px] text-slate-400"
                                onChange={(e) => setNewMilestoneDate({...newMilestoneDate, [g.id]: e.target.value})}
                             />
                             <button onClick={() => addMilestone(g)} className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] px-3 rounded-lg font-bold">+</button>
                        </div>

                        {g.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#080d16]/50">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleMilestone(g.id, milestone.id)}>
                                        {milestone.completed ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-600 hover:text-slate-300" />}
                                    </button>
                                    <span className={`text-xs ${milestone.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>{milestone.text}</span>
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono">{milestone.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Cognitive Goal Analysis</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Deconstructed milestones can be integrated into daily task lists. Setting goals helps structure focus sessions and tracks work accuracy over time.
          </p>
        </div>
      </div>
    </div>
  );
}

function FocusAmbientView({ 
  theme, 
  focusTime, 
  setFocusTime, 
  focusRunning, 
  setFocusRunning, 
  focusCategory, 
  setFocusCategory 
}) {
  const getTodayKey = () => {
    const today = new Date();
    return `lifeflow_focus_sec_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const storageKey = getTodayKey();

  const [dailySeconds, setDailySeconds] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    const lastTimeStr = localStorage.getItem('lifeflow_last_focus_time');
    const lastCategory = localStorage.getItem('lifeflow_last_focus_category');
    const lastTime = lastTimeStr ? parseInt(lastTimeStr, 10) : focusTime;

    const isFocusCategory = focusCategory !== 'Small Break' && focusCategory !== 'Long Break';
    const wasFocusCategory = lastCategory !== 'Small Break' && lastCategory !== 'Long Break';

    if (focusRunning && isFocusCategory && wasFocusCategory) {
      const delta = lastTime - focusTime;
      if (delta > 0 && delta < 1501) {
        setDailySeconds(prev => {
          const updatedSeconds = prev + delta;
          localStorage.setItem(storageKey, updatedSeconds.toString());
          return updatedSeconds;
        });
      }
    }

    localStorage.setItem('lifeflow_last_focus_time', focusTime.toString());
    localStorage.setItem('lifeflow_last_focus_category', focusCategory);
  }, [focusTime, focusRunning, focusCategory, storageKey]);

  const recordedMinutes = Math.floor(dailySeconds / 60);

  const formatTimeStr = () => {
    const mins = Math.floor(focusTime / 60);
    const secs = focusTime % 60;
    return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const timerPresets = [
    { label: 'Focus Time', seconds: 1500 }, 
    { label: 'Small Break', seconds: 300 },  
    { label: 'Long Break', seconds: 900 }    
  ];

  const getMaxTimeForCategory = () => {
    if (focusCategory === 'Small Break') return 300;
    if (focusCategory === 'Long Break') return 900;
    return 1500; 
  };

  const isPresetActive = (presetLabel) => {
    if (focusCategory === presetLabel) return true;
    if (presetLabel === 'Focus Time' && focusCategory === 'Coding') return true;
    return false;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Focus Ambient Room</h2>
        <p className="text-xs text-slate-400">Lock in long focus blocks without distractions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-3xl border dark:border-slate-800 bg-[#0b1322] flex flex-col items-center justify-center space-y-6">
          <div className="flex gap-2">
            {timerPresets.map(preset => (
              <button 
                key={preset.label}
                onClick={() => { setFocusCategory(preset.label); setFocusTime(preset.seconds); setFocusRunning(false); }}
                className={`px-3 py-1 text-[9px] font-bold uppercase rounded-lg border tracking-wider transition-all ${
                  isPresetActive(preset.label) ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-500'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="relative w-60 h-60 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="120" cy="120" r="100" fill="transparent" stroke="#080d16" strokeWidth="6" />
              <circle cx="120" cy="120" r="100" fill="transparent" stroke="#10b981" strokeWidth="6" 
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={2 * Math.PI * 100 * (1 - focusTime / getMaxTimeForCategory())}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center">
              <h1 className="text-4xl font-extrabold font-mono tracking-tighter text-slate-100">{formatTimeStr()}</h1>
              <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-mono mt-1">
                {focusCategory !== 'Small Break' && focusCategory !== 'Long Break' ? 'Deep Work Active' : 'Rest Period'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setFocusRunning(!focusRunning)} className="bg-emerald-500 hover:bg-emerald-600 text-[#080d16] text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
               {focusRunning ? <Square className="w-3.5 h-3.5 fill-[#080d16]" /> : <Play className="w-3.5 h-3.5 fill-[#080d16]" />}
              {focusRunning ? 'Pause Session' : 'Initiate Session'}
            </button>
            <button onClick={() => { setFocusTime(getMaxTimeForCategory()); setFocusRunning(false); }} className="bg-[#080d16] hover:bg-slate-900 border dark:border-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl">
              Reset
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl border dark:border-slate-800 bg-[#0b1322] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Session Analytics</h3>
          <div className="p-4 rounded-xl bg-[#080d16] border dark:border-slate-800/80 text-center flex flex-col justify-center min-h-[120px]">
            <span className="text-[9px] text-slate-500 font-mono uppercase block">Recorded Focus Today</span>
            <h4 className="text-2xl font-extrabold text-emerald-400 mt-2 font-mono tracking-tight">
              {recordedMinutes} <span className="text-sm text-slate-500 font-sans font-bold">Min</span>
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal mt-2">Active running minutes tracked across focus blocks. Breaks excluded.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`p-3.5 rounded-xl border transition-all ${task.completed ? 'opacity-60 bg-[#0b1322]/40 border-slate-900/60' : 'bg-[#0c1220] border-slate-800/80 hover:border-slate-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => onToggle(task.id)} className="mt-0.5">
            {task.completed ? <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-500/10" /> : <Circle className="w-4 h-4 text-slate-500 hover:text-emerald-400" />}
          </button>
          <div>
            <h4 className={`text-xs font-bold leading-normal text-slate-200 ${task.completed ? 'line-through text-slate-500 font-normal' : ''}`}>
              {task.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] text-slate-500">
              <span className="text-emerald-500 uppercase tracking-wider font-bold">{task.category}</span>
              <span>•</span>
              <span>{task.time || '12:00'}</span>
              <span>•</span>
              <span className={`font-bold ${task.priority === 'high' ? 'text-rose-500' : 'text-slate-400'}`}>
                {task.priority.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {task.subtasks && task.subtasks.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded text-slate-500 hover:text-white">
            <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {expanded && task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-3.5 pl-7 border-t dark:border-slate-850 pt-2.5 space-y-2 animate-fadeIn">
          {task.subtasks.map((st, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-400">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{st}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommandPalette({ onClose, onSelectView }) {
  const [paletteSearch, setPaletteSearch] = useState('');
  const commands = [
    { label: 'Go to Dashboard View', view: 'dashboard' },
    { label: 'Go to My Day View', view: 'myday' },
    { label: 'Manage All Tasks', view: 'tasks' },
    { label: 'Analyze Performance Analytics', view: 'analytics' },
    { label: 'Configure Integration Settings', view: 'settings' }
  ];
  const matched = commands.filter(cmd => cmd.label.toLowerCase().includes(paletteSearch.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-[#080d16]/80 backdrop-blur-sm flex items-start justify-center p-4 pt-20">
      <div className="max-w-lg w-full p-4 rounded-2xl bg-[#0b1322] border border-slate-800 shadow-2xl space-y-3">
        <div className="flex items-center gap-2 bg-[#080d16] p-2 rounded-xl border border-slate-800">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Type a directory path or layout view..."
            className="w-full bg-transparent border-none outline-none text-xs text-slate-200"
            value={paletteSearch}
            onChange={(e) => setPaletteSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-1">
          {matched.map((cmd, idx) => (
           <button key={idx} onClick={() => onSelectView(cmd.view)} className="w-full p-2.5 rounded-xl hover:bg-[#080d16] text-xs text-left text-slate-300 hover:text-white transition-all flex justify-between items-center">
              <span>{cmd.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
          <span>Press ESC to exit</span>
          <button onClick={onClose} className="hover:text-white">CLOSE PALETTE</button>
        </div>
      </div>
    </div>
  );
}

function OnboardingOverlay({ theme, onClose }) {
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [answers, setAnswers] = useState({ archetype: 'student', stars: 'deep habits', planningStyle: 'time blocks' });
  return (
    <div className="fixed inset-0 z-50 bg-[#080d16]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-2xl bg-[#0b1322] border border-slate-800 shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5">
            {[1, 2, 3].map(stepNum => <span key={stepNum} className={`w-6 h-1 rounded-full ${onboardingStep >= stepNum ? 'bg-emerald-500' : 'bg-slate-800'}`} />)}
          </div>
          <span className="text-[9px] text-emerald-400 font-mono">STEP {onboardingStep} OF 3</span>
        </div>

        {onboardingStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-100">Select your workspace style</h3>
            <div className="grid grid-cols-2 gap-2">
              {['student', 'developer', 'creator', 'founder'].map(arch => (
                <button key={arch} onClick={() => setAnswers({ ...answers, archetype: arch })} className={`p-3 rounded-xl border text-left capitalize text-xs font-semibold ${answers.archetype === arch ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-[#080d16]'}`}>
                  {arch}
                </button>
              ))}
            </div>
            <button onClick={() => setOnboardingStep(2)} className="w-full bg-emerald-500 text-[#080d16] font-bold text-xs py-2 rounded-xl">Next Step</button>
          </div>
        )}

        {onboardingStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-100">Establish your North Star goal</h3>
            <div className="space-y-2">
              {['deep habits', 'career milestones', 'health markers', 'theory study'].map(g => (
                <button key={g} onClick={() => setAnswers({ ...answers, stars: g })} className={`w-full p-3 rounded-xl border text-left capitalize text-xs font-semibold ${answers.stars === g ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-[#080d16]'}`}>
                  {g}
                </button>
              ))}
            </div>
            <button onClick={() => setOnboardingStep(3)} className="w-full bg-emerald-500 text-[#080d16] font-bold text-xs py-2 rounded-xl">Next Step</button>
          </div>
        )}

        {onboardingStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-100">Calibrate energy cycles</h3>
            <div className="space-y-2">
              {['morning peak hours', 'balanced daylight flow', 'late night blocks'].map(p => (
                <button key={p} onClick={() => setAnswers({ ...answers, planningStyle: p })} className={`p-3 rounded-xl border text-left capitalize text-xs font-semibold ${answers.planningStyle === p ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-[#080d16]'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full bg-emerald-500 text-[#080d16] font-bold text-xs py-2 rounded-xl">Complete Calibration</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><LifeFlow /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  );
}