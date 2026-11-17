import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { API } from '../api';
import { Bell, Flame, BarChart2, Activity, CheckCircle, Star, Dumbbell, Clock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function WorkoutDashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const handleStartStandaloneSession = async (w: any) => {
      try { await API.session.create(user?.trainee_id || 1); } catch(e){}
      navigate(`/session/${w.workout_id}`, { state: { workoutName: w.name }});
  };

  useEffect(() => {
    if (user?.plan_id) {
      API.workouts.getPlan(user.plan_id).then((data: any) => setWorkouts(data)).catch((e: any) => console.error(e));
    }
    if (user?.trainee_id) {
      API.analytics.getAnalytics(user.trainee_id, 'all_time').then((data: any) => setStats(data)).catch((e: any) => console.error(e));
    }
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  // --- Map Real stats to temporal metrics ---

  const dayNamesFull = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // "Workout Overview" Chart Data (Last 7 Days)
  const [timeframe, setTimeframe] = useState<'this_week' | 'last_week' | '2_weeks_ago'>('this_week');

  let dayOffsetStart = 6;
  let dayOffsetEnd = 0;
  if (timeframe === 'last_week') {
      dayOffsetStart = 13;
      dayOffsetEnd = 7;
  } else if (timeframe === '2_weeks_ago') {
      dayOffsetStart = 20;
      dayOffsetEnd = 14;
  }

  const chartDays = [];
  for (let i = dayOffsetStart; i >= dayOffsetEnd; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartDays.push(d);
  }

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const actualChartData = chartDays.map(d => {
      const dateStr = formatLocalDate(d);
      const todaySessions = (stats?.sessions || []).filter((s: any) => s.date && s.date.startsWith(dateStr));

      let percentageSum = 0;
      let totalExercises = 0;

      todaySessions.forEach((s: any) => {
          let output = s.duration > 0 ? s.duration : s.correct_reps;
          let target = s.target_val || 10;
          let perc = Math.min((output / target) * 100, 100); // Strict 100% Cap
          percentageSum += perc;
          totalExercises++;
      });

      // Calculate average percentage completion for the day
      let dayScore = totalExercises > 0 ? (percentageSum / totalExercises) : 0;

      return { day: dayNamesFull[d.getDay()].substring(0,3), score: Math.round(dayScore) };
  });

  // "Muscle Focus" Doughnut Data (DB Driven Mode)
  const categoryTotals: any = {};
  if (stats?.sessions && stats.sessions.length > 0) {
     stats.sessions.forEach((s: any) => {
        let cat = s.category || 'Chest';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
     });
  }

  const colorMap: any = { 'Chest': '#9b51e0', 'Back': '#3182ce', 'Legs': '#38a169', 'Core': '#dd6b20', 'Cardio': '#e53e3e', 'Full Body': '#667eea' };
  const pieData = Object.keys(categoryTotals).length > 0
      ? Object.keys(categoryTotals).map(k => ({
          name: k,
          value: Math.round((categoryTotals[k] / stats.sessions.length) * 100),
          color: colorMap[k] || '#8884d8'
        }))
      : [{ name: 'Pending', value: 100, color: '#232736' }];

  // Calendar Dynamic Mapping (Full Month)
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
     if (user?.trainee_id) {
         API.analytics.getCalendar(user.trainee_id).then((data: any) => setCalendarData(data)).catch((e: any) => console.error(e));
     }
  }, [user]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const scheduleMap = new Map();
  calendarData.forEach(d => scheduleMap.set(d.date, d.status));

  const calendarGrid = [];
  for (let i = 0; i < firstDay; i++) {
     calendarGrid.push(<div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
     const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
     const status = scheduleMap.get(dateStr);
     let bgColor = 'bg-[#1b1c2b] border border-white/5 text-gray-400 hover:bg-[#252836]';
     let title = 'Normal Day';
     const isToday = dateStr === formatLocalDate(new Date());

     if (status === 'scheduled') {
         bgColor = 'bg-blue-500/20 border border-blue-500/50 text-blue-400 font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]';
         title = 'Scheduled Workout (Blue)';
     } else if (status === 'completed') {
         bgColor = 'bg-green-500/20 border border-green-500/50 text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]';
         title = 'Completed (Green)';
     } else if (status === 'missed') {
         bgColor = 'bg-red-500/20 border border-red-500/50 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]';
         title = 'Missed (Red)';
     } else if (status === 'extra') {
         bgColor = 'bg-purple-500/20 border border-purple-500/50 text-purple-400 font-bold shadow-[0_0_10px_rgba(168,85,247,0.2)]';
         title = 'Bonus Workout (Purple)';
     }
     if (isToday && status === undefined) bgColor += ' border-primary text-white';

     calendarGrid.push(
         <div key={d} title={title} className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm transition cursor-default ${bgColor}`}>
            {d}
         </div>
     );
  }
  let globalComplianceSum = 0;
  let totalExercisesEver = 0;
  if (stats?.sessions) {
     stats.sessions.forEach((s: any) => {
          let output = s.duration > 0 ? s.duration : s.correct_reps;
          let target = s.target_val || 10;
          globalComplianceSum += Math.min((output / target) * 100, 100);
          totalExercisesEver++;
     });
  }
  const averageCompliance = totalExercisesEver > 0 ? Math.min(Math.round(globalComplianceSum / totalExercisesEver), 100) : 0;

  // --- Dynamic Reminder KPI Data ---
  const todayDateStr = formatLocalDate(new Date());
  const todayStatus = scheduleMap.get(todayDateStr);

  // Find next scheduled date after today
  let nextDateObj = null;
  for (let i = 1; i <= 30; i++) {
     const nextDay = new Date();
     nextDay.setDate(nextDay.getDate() + i);
     if (scheduleMap.get(formatLocalDate(nextDay)) === 'scheduled') {
         nextDateObj = nextDay;
         break;
     }
  }

  let reminderTheme = 'bg-gradient-to-br from-primary/20 to-[#161925] border-primary/30';
  let reminderTitle = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  let reminderIcon = <Clock size={16} className="text-primary" />;
  let reminderIconBg = 'bg-primary/20';
  let reminderSubtitle = 'Ready to crush it today?';
  let reminderBtnText = 'Start Workout';
  let reminderBtnStyle = 'bg-primary hover:bg-secondary text-white';

  if (todayStatus === 'scheduled') {
      reminderTheme = 'bg-gradient-to-br from-indigo-500/20 to-[#161925] border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.15)]';
      reminderIcon = <Bell size={16} className="text-indigo-400" />;
      reminderIconBg = 'bg-indigo-500/20';
      reminderSubtitle = "Reminder: Today is your workout day. Let's go!";
      reminderBtnText = 'Start Workout';
      reminderBtnStyle = 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]';
  } else if (todayStatus === 'completed' || todayStatus === 'extra') {
      reminderTheme = 'bg-gradient-to-br from-emerald-500/10 to-[#161925] border-emerald-500/20';
      reminderIcon = <CheckCircle size={16} className="text-emerald-400" />;
      reminderIconBg = 'bg-emerald-500/10';
      reminderSubtitle = `Awesome job! Next workout is on ${nextDateObj ? nextDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}.`;
      reminderBtnText = 'Bonus Workout';
      reminderBtnStyle = 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400';
  } else {
      reminderTheme = 'bg-gradient-to-br from-cyan-500/10 to-[#161925] border-cyan-500/20';
      reminderIcon = <Calendar size={16} className="text-cyan-400" />;
      reminderIconBg = 'bg-cyan-500/10';
      reminderSubtitle = `Rest day. Next scheduled for ${nextDateObj ? nextDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD'}.`;
      reminderBtnText = 'Free Train';
      reminderBtnStyle = 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400';
  }

  return (
    <div className="w-full h-full flex bg-[#10121b] text-white selection:bg-primary/30">
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col p-8 overflow-y-auto">

        {/* Header Block */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Good Morning, <span className="text-secondary">{user.name}!</span> 👋</h1>
            <p className="text-gray-400">Ready to crush your goals today?</p>
          </div>

          <div className="flex items-center gap-4">
             {/* Streak Badge */}
             <div className="bg-[#191c28] border border-white/5 rounded-full px-5 py-2 flex items-center gap-3">
               <div className="bg-orange-500/20 p-2 rounded-full"><Flame size={16} className="text-orange-500" /></div>
               <div className="text-sm">
                 <div className="font-bold">{stats?.total_sessions > 0 ? stats.total_sessions : 0}</div>
                 <div className="text-gray-500 text-xs">Total Sessions</div>
               </div>
             </div>
             {/* Plan Badge */}
             <div className="bg-gradient-to-r from-primary to-secondary rounded-full px-5 py-2 flex items-center gap-3 shadow-[0_0_15px_rgba(102,126,234,0.3)]">
               <div className="bg-white/20 p-2 rounded-full"><BarChart2 size={16} className="text-white" /></div>
               <div className="text-sm">
                 <div className="text-white/80 text-xs">Current Plan</div>
                 <div className="font-bold">{user.fitness_level || 'Beginner'}</div>
               </div>
             </div>
             {/* Notification */}
             <div className="p-3 relative bg-[#191c28] rounded-full cursor-pointer hover:bg-white/5 transition">
               <div className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-2 border-2 border-[#191c28]" />
               <Bell size={20} />
             </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
           {/* Goal Completion */}
           <div className="bg-[#161925] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
              <div className="flex items-center gap-4 mb-4">
                 <div className="p-3 bg-yellow-500/10 rounded-full"><Star size={24} className="text-yellow-500" /></div>
                 <div>
                   <div className="text-gray-400 text-sm">Goal Completion</div>
                   <div className="text-2xl font-bold">{averageCompliance}% <span className="text-sm text-gray-500">/ 100% Target</span></div>
                 </div>
              </div>
              <div className="w-full h-2 bg-[#232736] rounded-full overflow-hidden">
                 <div className="h-full bg-primary rounded-full transition-all" style={{width: `${Math.min(averageCompliance, 100)}%`}}></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">{averageCompliance}% Target Accuracy</div>
           </div>

           {/* Target Shortfall */}
           <div className="bg-[#161925] p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-500/10 rounded-full"><Activity size={24} className="text-blue-500" /></div>
                 <div>
                   <div className="text-gray-400 text-sm">Target Shortfall</div>
                   <div className="text-2xl font-bold">{Math.max(100 - averageCompliance, 0)}% <span className="text-sm text-gray-500">/ 100%</span></div>
                 </div>
              </div>
              <div className="w-full h-2 bg-[#232736] rounded-full overflow-hidden mt-4 shrink-0 rotate-180">
                 <div className="h-full bg-blue-500 rounded-full transition-all" style={{width: `${Math.max(100 - averageCompliance, 0)}%`}}></div>
              </div>
              <div className="text-right text-xs text-gray-400 mt-1">Goal</div>
           </div>

           {/* Workouts Completed */}
           <div className="bg-[#161925] p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4 mb-2">
                 <div className="p-3 bg-green-500/10 rounded-full"><CheckCircle size={24} className="text-green-500" /></div>
                 <div>
                   <div className="text-gray-400 text-sm">Workouts Completed</div>
                   <div className="text-2xl font-bold">{stats?.total_sessions || 0}</div>
                 </div>
              </div>
              <div className="text-sm text-gray-500 mt-4">Keep going!</div>
           </div>

           {/* Dynamic Schedule Reminder */}
           <div className={`${reminderTheme} p-5 rounded-2xl border flex flex-col justify-between shadow-lg relative overflow-hidden transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2 relative z-10">
                 <div className="text-gray-300 font-bold text-sm">
                    {reminderTitle}
                 </div>
                 <div className={`${reminderIconBg} p-2 rounded-full shadow-inner`}>{reminderIcon}</div>
              </div>
              <div className="text-sm text-gray-400 mb-4 tracking-wide font-medium relative z-10 leading-snug">
                 {reminderSubtitle}
              </div>
              <button
                 onClick={() => navigate('/workouts')}
                 className={`w-full relative z-10 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 hover:-translate-y-0.5 ${reminderBtnStyle}`}
              >
                 <Dumbbell size={18} /> {reminderBtnText}
              </button>
           </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-[3fr_2fr] gap-6 mb-8">
            {/* Overview Curve */}
            <div className="bg-[#161925] p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center mb-6">
                   <div className="flex items-center gap-2 font-semibold">
                      <BarChart2 className="text-primary" size={20} /> Workout Overview
                   </div>
                   <select
                      value={timeframe}
                      onChange={(e: any) => setTimeframe(e.target.value as any)}
                      className="bg-[#1e2231] border border-white/10 text-white rounded-lg px-3 py-1 outline-none text-sm cursor-pointer"
                   >
                      <option value="this_week">This Week</option>
                      <option value="last_week">Last Week</option>
                      <option value="2_weeks_ago">2 Weeks Ago</option>
                   </select>
                </div>
                <div className="w-full h-64 text-xs">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={actualChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                         <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <XAxis dataKey="day" axisLine={false} tickLine={false} stroke="#6b7280" />
                         <YAxis axisLine={false} tickLine={false} stroke="#6b7280" />
                         <Tooltip contentStyle={{ backgroundColor: '#191c28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                         <Area type="monotone" dataKey="score" stroke="#667eea" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 6, fill: '#667eea' }} />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
            </div>

            {/* Muscle Focus Doughnut */}
            <div className="bg-[#161925] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                <div className="font-semibold mb-4">Muscle Focus</div>
                <div className="flex-1 flex items-center justify-between">
                   <div className="w-48 h-48 relative">
                       <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                               <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={0} stroke="none" dataKey="value">
                                   {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                               </Pie>
                           </PieChart>
                       </ResponsiveContainer>
                       {/* Center Text */}
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <div className="text-gray-400 text-xs">Total</div>
                          <div className="text-2xl font-bold leading-none my-1">{stats?.total_sessions || 0}</div>
                          <div className="text-gray-400 text-[10px]">Sessions</div>
                       </div>
                   </div>
                   <div className="flex flex-col gap-3 ml-4">
                      {pieData.map(d => (
                         <div key={d.name} className="flex justify-between gap-6 text-sm">
                             <div className="flex items-center gap-2 text-gray-300">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div> {d.name}
                             </div>
                             <div className="text-gray-500 font-medium">{d.value}%</div>
                         </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>

        {/* Bottom Rows (Workouts / Calendar) */}
        <div className="grid grid-cols-[2fr_3fr] gap-6">
            {/* Recent Workouts Card */}
            <div className="bg-[#161925] p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                 <div>
                   <div className="flex justify-between items-center mb-4">
                      <div className="font-semibold text-white text-lg">Recent Workouts</div>
                      <button
                         onClick={() => workouts.length > 0 ? handleStartStandaloneSession(workouts[0]) : navigate('/workouts')}
                         className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5"
                      >
                         <Dumbbell size={14} /> Start New
                      </button>
                   </div>

                   <div className="flex flex-col gap-3">
                      {(() => {
                         const sess = stats?.sessions || [];
                         if (sess.length === 0) return null;
                         const latestDate = sess[sess.length - 1].date;
                         // Filter to only those with the exact same timestamp string, then reverse so they show nicely
                         const latestExercises = sess.filter((s: any) => s.date === latestDate).reverse();

                         return latestExercises.map((s: any, idx: number) => {
                             const isTimeBased = s.duration > 0;
                             let displayPercentage = 0;
                             let metricLabel = "Accuracy";

                             if (!isTimeBased) {
                                 const totalReps = s.correct_reps + (s.wrong_reps || 0);
                                 displayPercentage = totalReps > 0 ? Math.round((s.correct_reps / totalReps) * 100) : 0;
                             } else {
                                 const target = s.target_val || 30;
                                 displayPercentage = Math.min(Math.round((s.duration / target) * 100), 100);
                                 metricLabel = "Completion";
                             }

                             const exerciseName = s.exercise_name || s.name || 'Workout';
                             const dateDisplay = s.date ? s.date.split('T')[0] : 'Recent';

                             return (
                                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-[#1e2231]/60 hover:bg-[#1e2231] transition border border-white/5">
                                    <div className="flex items-center gap-3.5">
                                       <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-inner">
                                          <Dumbbell size={18} />
                                       </div>
                                       <div>
                                          <div className="font-bold text-sm text-white flex items-center gap-2">
                                             {exerciseName}
                                             <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/5 text-gray-300 border-white/10">
                                                {isTimeBased ? 'Timed' : 'Reps'}
                                             </span>
                                          </div>
                                          <div className="text-xs text-gray-400 mt-0.5">
                                             {isTimeBased ? `${s.duration}s Hold` : `${s.correct_reps} Reps Completed`}
                                             {s.wrong_reps > 0 && <span className="text-red-400 font-medium ml-1.5">• {s.wrong_reps} Form Error{s.wrong_reps > 1 ? 's' : ''}</span>}
                                             <span className="text-gray-500 ml-2">({dateDisplay})</span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                       <div className={`font-bold text-sm ${displayPercentage >= 80 ? 'text-green-400' : displayPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                          {displayPercentage}%
                                       </div>
                                       <div className="text-[10px] text-gray-500">{metricLabel}</div>
                                    </div>
                                </div>
                             );
                         });
                      })()}

                      {(!stats?.sessions || stats.sessions.length === 0) && (
                         <div className="text-sm text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-xl">
                            No workout session history found yet.
                         </div>
                      )}
                   </div>
                 </div>
            </div>

            {/* Calendar */}
            <div className="bg-[#161925] p-6 rounded-2xl border border-white/5 flex flex-col h-full justify-center">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <div className="font-semibold text-white text-lg">Workout Calendar</div>
                        <div className="text-xs mt-2 flex gap-3 text-gray-400">
                           <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>Scheduled</span>
                           <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>Completed</span>
                           <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>Missed</span>
                           <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>Bonus</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-[#191c28] rounded-full px-4 py-2 border border-white/5 shadow-inner">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:text-primary transition"><ChevronLeft size={18} /></button>
                        <div className="text-sm font-bold text-white w-28 text-center tracking-wide">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:text-primary transition"><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-y-4 gap-x-2 mb-2 justify-items-center opacity-50 border-b border-white/5 pb-3">
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Sun</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Mon</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Tue</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Wed</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Thu</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Fri</div>
                    <div className="text-[11px] font-bold text-center w-8 md:w-10 tracking-widest uppercase">Sat</div>
                </div>

                <div className="grid grid-cols-7 gap-y-3 gap-x-2 pt-4 justify-items-center">
                    {calendarGrid}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
