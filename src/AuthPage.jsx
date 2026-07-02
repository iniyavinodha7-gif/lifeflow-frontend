import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import the hook
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const navigate = useNavigate(); // 2. Initialize the hook
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const payload = {
      email: email,
      username: isLogin ? "" : username,
      isLogin: isLogin
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed");
      }

      const data = await response.json();

      localStorage.setItem('lifeflow_auth_token', 'active_session');
      localStorage.setItem('lifeflow_user_name', data.name);
      localStorage.setItem('lifeflow_user_role', data.role);
      localStorage.setItem('lifeflow_user_id', data.user_id);

      navigate('/dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Reset fields on toggle
    setEmail('');
    setPassword('');
    setUsername('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen font-sans antialiased selection:bg-emerald-500/35 flex items-center justify-center p-6 bg-[#080d16] text-slate-100">
      
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#0b1322] border border-slate-800 shadow-2xl animate-fadeIn relative overflow-hidden">
        
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />

        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Initialize Workspace'}
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-mono tracking-wider uppercase">
            {isLogin ? 'Authenticate to continue' : 'Register a new profile'}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up Only: Username */}
          {!isLogin && (
            <div className="relative flex items-center">
              <User className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Username"
                required
                className="w-full bg-[#080d16] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          {/* Shared: Gmail ID */}
          <div className="relative flex items-center">
            <Mail className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input 
              type="email" 
              placeholder="Gmail Address"
              required
              className="w-full bg-[#080d16] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Shared: Password */}
          <div className="relative flex items-center">
            <Lock className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
            <input 
              type="password" 
              placeholder="Password"
              required
              className="w-full bg-[#080d16] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Sign Up Only: Confirm Password */}
          {!isLogin && (
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
              <input 
                type="password" 
                placeholder="Confirm Password"
                required
                className="w-full bg-[#080d16] border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs outline-none text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {/* Submit Button */}
          <button 
             type="submit" 
             className="w-full bg-emerald-500 hover:bg-emerald-600 text-[#080d16] font-extrabold text-xs px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all mt-2">
             <span>{isLogin ? 'Access Dashboard' : 'Create Profile'}</span>
             <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center border-t border-slate-800/60 pt-6">
          <p className="text-xs text-slate-400">
            {isLogin ? "Don't have an account? " : "Already have a profile? "}
            <button 
              type="button"
              onClick={toggleMode}
              className="text-emerald-400 font-bold hover:underline font-mono tracking-tight"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}