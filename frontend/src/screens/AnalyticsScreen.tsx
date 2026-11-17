import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import Sidebar from '../components/Sidebar';
import {
  Target,
  Info,
  Check,
  X,
  Flame,
  Dumbbell,
  Timer,
  Calendar,
  Clock,
  ChevronDown,
  TrendingUp,
  User,
  Activity
} from 'lucide-react';

export default function AnalyticsScreen({ user, onLogout }: { user: any; onLogout?: () => void }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rep' | 'time'>('rep');
  const [dateRange, setDateRange] = useState('This Week');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getTimeframeKey = (range: string) => {
    switch (range) {
      case 'Today':
        return 'today';
      case 'Last Week':
        return 'last_week';
      case 'All Time':
        return 'all_time';
      default:
        return 'this_week';
    }
  };

  useEffect(() => {
    if (user?.trainee_id) {
      setIsLoading(true);
      const tf = getTimeframeKey(dateRange);
      API.analytics
        .getAnalytics(user.trainee_id, tf)
        .then((data: any) => {
          setStats(data);
        })
        .catch((e: any) => console.error(e))
        .finally(() => setIsLoading(false));
    }
  }, [user, dateRange]);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
    if (onLogout) onLogout();
    navigate('/');
  };

  const summary = stats?.summary || {
    total_workouts: 0,
    total_reps: 0,
    correct_reps: 0,
    wrong_reps: 0,
    overall_accuracy: 0.0,
    total_calories: 0,
    avg_duration_min: 0.0,
    reps_trend: '+12.5% vs last week',
    wrong_reps_trend: '-8.3% vs last week'
  };

  const repWorkouts = stats?.rep_workouts || [
    { name: 'Jumping Jack', target: 100, total_reps: 0, correct_reps: 0, wrong_reps: 0, accuracy: 0.0, best: 0, best_date: '-' },
    { name: 'Push-up', target: 20, total_reps: 0, correct_reps: 0, wrong_reps: 0, accuracy: 0.0, best: 0, best_date: '-' },
    { name: 'Crunches', target: 15, total_reps: 0, correct_reps: 0, wrong_reps: 0, accuracy: 0.0, best: 0, best_date: '-' },
    { name: 'Squat', target: 30, total_reps: 0, correct_reps: 0, wrong_reps: 0, accuracy: 0.0, best: 0, best_date: '-' }
  ];

  const timeWorkouts = stats?.time_workouts || [
    { name: 'Plank', target_time: 60, target_str: '60 sec', best_time_str: '00:00', avg_time_str: '00:00', improvement: '0.0%', trend: [0, 0, 0, 0, 0] },
    { name: 'Cobra Stretch', target_time: 60, target_str: '60 sec', best_time_str: '00:00', avg_time_str: '00:00', improvement: '0.0%', trend: [0, 0, 0, 0, 0] }
  ];

  const insights = stats?.insights || [
    { icon: 'up', type: 'success', text: 'Great job! Keep completing workouts to improve daily.' },
    { icon: 'focus', type: 'warning', text: 'Maintain consistent form across all exercise sets.' },
    { icon: 'down', type: 'danger', text: 'Focus on form precision to minimize wrong reps.' }
  ];

  // Helper for Exercise Icon styling
  const getExerciseBadgeStyle = (name: string) => {
    switch (name) {
      case 'Jumping Jack':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'Push-up':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'Crunches':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'Squat':
        return 'bg-pink-500/20 text-pink-400 border border-pink-500/30';
      case 'Plank':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'Cobra Stretch':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
    }
  };

  // SVG Sparkline component for trends
  const Sparkline = ({ points }: { points: number[] }) => {
    if (!points || points.length === 0) points = [10, 20, 15, 25, 30];
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    const width = 70;
    const height = 24;

    const pathPoints = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x},${y}`;
      })
      .join(' L ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={`M ${pathPoints}`} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  };

  return (
    <div className="w-screen h-screen flex bg-[#0c0d14] text-white overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Analytics Content Area */}
      <div className="flex-1 h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
        {/* Top Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Workout Analytics</h1>
            <p className="text-gray-400 text-sm mt-1">Track your overall performance and improve every day.</p>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Rep-based vs Time-based Segmented Control */}
            <div className="bg-[#141624] p-1 rounded-xl border border-white/10 flex items-center shadow-inner">
              <button
                onClick={() => setActiveTab('rep')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'rep'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rep-based
              </button>
              <button
                onClick={() => setActiveTab('time')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                  activeTab === 'time'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Time-based
              </button>
            </div>

            {/* Date Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="bg-[#141624] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition shadow-sm"
              >
                <Calendar size={16} className="text-indigo-400" />
                <span>{dateRange}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {showDatePicker && (
                <div className="absolute right-0 mt-2 w-44 bg-[#1a1c2e] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                  {['Today', 'This Week', 'Last Week', 'All Time'].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setDateRange(option);
                        setShowDatePicker(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition ${
                        dateRange === option ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-gray-300'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Top 5 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Workouts */}
              <div className="bg-[#141624] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                    <Target size={20} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">This Week</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Workouts</div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{summary.total_workouts}</div>
                </div>
              </div>

              {/* Total Reps */}
              <div className="bg-[#141624] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                    <Info size={20} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    +12.5% vs last week
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Reps</div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{summary.total_reps.toLocaleString()}</div>
                </div>
              </div>

              {/* Correct Reps */}
              <div className="bg-[#141624] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                    <Check size={20} />
                  </div>
                  <span className="text-xs font-semibold text-emerald-400">{summary.overall_accuracy}% Accuracy</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Correct Reps</div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{summary.correct_reps.toLocaleString()}</div>
                </div>
              </div>

              {/* Wrong Reps */}
              <div className="bg-[#141624] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
                    <X size={20} />
                  </div>
                  <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    -8.3% vs last week
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Wrong Reps</div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{summary.wrong_reps.toLocaleString()}</div>
                </div>
              </div>

              {/* Calories Burn */}
              <div className="bg-[#141624] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                    <Flame size={20} />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">This Week</span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Calories Burn</div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {summary.total_calories.toLocaleString()} <span className="text-sm font-normal text-gray-400">kcal</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Middle Section: Rep-based & Time-based Side-by-Side Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Table: Rep-based Workouts */}
              <div className="bg-[#141624] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Dumbbell size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Rep-based Workouts</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs font-semibold border-b border-white/5 pb-3">
                          <th className="pb-3 font-medium">Workout</th>
                          <th className="pb-3 text-center font-medium">Target Reps</th>
                          <th className="pb-3 text-center font-medium">Total Reps</th>
                          <th className="pb-3 text-center font-medium">Correct</th>
                          <th className="pb-3 text-center font-medium">Wrong</th>
                          <th className="pb-3 text-center font-medium">Accuracy</th>
                          <th className="pb-3 text-right font-medium">Best</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {repWorkouts.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition">
                            <td className="py-4 pr-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getExerciseBadgeStyle(item.name)}`}>
                                  <Activity size={16} />
                                </div>
                                <span className="font-semibold text-white">{item.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-center font-medium text-gray-300">{item.target}</td>
                            <td className="py-4 text-center font-semibold text-white">{item.total_reps}</td>
                            <td className="py-4 text-center font-semibold text-emerald-400">{item.correct_reps}</td>
                            <td className="py-4 text-center font-semibold text-rose-400">{item.wrong_reps}</td>
                            <td className="py-4 text-center">
                              <div className="flex flex-col items-center gap-1 min-w-[70px]">
                                <span className="font-semibold text-xs text-white">{item.accuracy}%</span>
                                <div className="w-16 bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.accuracy >= 75
                                        ? 'bg-emerald-500'
                                        : item.accuracy >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${Math.min(item.accuracy, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="font-bold text-white text-sm">{item.best}</div>
                              <div className="text-[11px] text-gray-400">{item.best_date}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                  <button className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold inline-flex items-center gap-1 transition">
                    View All Rep-based Workouts <ChevronDown size={14} className="-rotate-90" />
                  </button>
                </div>
              </div>

              {/* Right Table: Time-based Workouts */}
              <div className="bg-[#141624] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Timer size={18} />
                    </div>
                    <h2 className="text-lg font-bold text-white">Time-based Workouts</h2>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs font-semibold border-b border-white/5 pb-3">
                          <th className="pb-3 font-medium">Workout</th>
                          <th className="pb-3 text-center font-medium">Target Time</th>
                          <th className="pb-3 text-center font-medium">Best Time</th>
                          <th className="pb-3 text-center font-medium">Avg. Time</th>
                          <th className="pb-3 text-center font-medium">Improvement</th>
                          <th className="pb-3 text-right font-medium">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {timeWorkouts.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition">
                            <td className="py-4 pr-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getExerciseBadgeStyle(item.name)}`}>
                                  <Timer size={16} />
                                </div>
                                <span className="font-semibold text-white">{item.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-center font-medium text-gray-300">{item.target_str}</td>
                            <td className="py-4 text-center font-semibold text-white">{item.best_time_str}</td>
                            <td className="py-4 text-center font-semibold text-gray-300">{item.avg_time_str}</td>
                            <td className="py-4 text-center">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  item.improvement?.startsWith('+')
                                    ? 'text-emerald-400 bg-emerald-500/10'
                                    : 'text-rose-400 bg-rose-500/10'
                                }`}
                              >
                                {item.improvement}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end items-center">
                                <Sparkline points={item.trend} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                  <button className="text-purple-400 hover:text-purple-300 text-sm font-semibold inline-flex items-center gap-1 transition">
                    View All Time-based Workouts <ChevronDown size={14} className="-rotate-90" />
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Bottom Section: Performance Summary & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Card: Performance Summary */}
              <div className="bg-[#141624] border border-white/5 rounded-2xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 pb-3 border-b border-white/5">Performance Summary</h2>

                <div className="flex flex-col sm:flex-row items-center gap-8">
                  {/* SVG Donut Ring Chart */}
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background Track */}
                      <circle cx="50" cy="50" r="40" stroke="#1f2238" strokeWidth="10" fill="transparent" />
                      {/* Gradient Progress Arc */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#accuracyGradient)"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * Math.min(summary.overall_accuracy, 100)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="accuracyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Center Text */}
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-extrabold text-white tracking-tight">{summary.overall_accuracy}%</span>
                      <span className="text-[11px] text-gray-400 font-medium">Overall Accuracy</span>
                    </div>
                  </div>

                  {/* 6 KPI Stat Blocks */}
                  <div className="grid grid-cols-2 gap-4 flex-1 w-full">
                    {/* Correct Reps */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <Check size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.correct_reps.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Correct Reps</div>
                      </div>
                    </div>

                    {/* Wrong Reps */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                        <X size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.wrong_reps.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Wrong Reps</div>
                      </div>
                    </div>

                    {/* Total Reps */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                        <Dumbbell size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.total_reps.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Total Reps</div>
                      </div>
                    </div>

                    {/* Calories Burn */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                        <Flame size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.total_calories.toLocaleString()} kcal</div>
                        <div className="text-xs text-gray-400">Calories Burn</div>
                      </div>
                    </div>

                    {/* Total Workouts */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.total_workouts}</div>
                        <div className="text-xs text-gray-400">Total Workouts</div>
                      </div>
                    </div>

                    {/* Avg Duration */}
                    <div className="bg-[#1a1c2e] border border-white/5 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">{summary.avg_duration_min} min</div>
                        <div className="text-xs text-gray-400">Avg. Duration</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Card: Insights */}
              <div className="bg-[#141624] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white mb-6 pb-3 border-b border-white/5">Insights</h2>

                  <div className="space-y-4">
                    {insights.map((item: any, idx: number) => {
                      let IconComp = TrendingUp;
                      let iconStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

                      if (item.icon === 'focus') {
                        IconComp = User;
                        iconStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                      } else if (item.icon === 'down') {
                        IconComp = X;
                        iconStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                      }

                      return (
                        <div key={idx} className="bg-[#1a1c2e] border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-white/10 transition">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconStyle}`}>
                            <IconComp size={20} />
                          </div>
                          <p className="text-sm font-medium text-gray-200 leading-relaxed">{item.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 text-center">
                  <button className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold inline-flex items-center gap-1 transition">
                    View Detailed Insights <ChevronDown size={14} className="-rotate-90" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
