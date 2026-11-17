import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { API } from '../api';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, XCircle, Dumbbell, Flame, Target, Award } from 'lucide-react';

export default function CalendarScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate();
  const [calendarData, setCalendarData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date());

  useEffect(() => {
    if (user?.trainee_id) {
       API.analytics.getCalendar(user.trainee_id).then((data: any) => setCalendarData(data)).catch((e: any) => console.error(e));
       API.analytics.getAnalytics(user.trainee_id, 'all_time').then((data: any) => setStats(data)).catch((e: any) => console.error(e));
    }
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const scheduleMap = new Map();
  calendarData.forEach(d => scheduleMap.set(d.date, d.status));

  // Calculate KPIs
  const allCompletedDates = calendarData.filter(d => d.status === 'completed' || d.status === 'extra').map(d => d.date).sort();
  const allScheduledDatesThisMonth = calendarData.filter(d =>
      d.status !== 'extra' &&
      d.date.startsWith(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`)
  );

  let currentStreak = 0;
  const todayStr = formatLocalDate(new Date());

  // Simple streak math: start from today or yesterday and walk backwards
  let checkDate = new Date();
  if (!allCompletedDates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
      if (allCompletedDates.includes(formatLocalDate(checkDate))) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
      } else {
          break;
      }
  }

  const completedThisMonth = allScheduledDatesThisMonth.filter(d => d.status === 'completed').length;
  const totalScheduledThisMonth = allScheduledDatesThisMonth.filter(d => d.status === 'scheduled' || d.status === 'missed' || d.status === 'completed').length;
  const adherence = totalScheduledThisMonth > 0 ? Math.round((completedThisMonth / totalScheduledThisMonth) * 100) : 100;

  // Calendar Grid Building
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calendarGrid = [];
  for (let i = 0; i < firstDayIndex; i++) {
     calendarGrid.push(<div key={`empty-${i}`} className="h-24"></div>);
  }

  for (let d = 1; d <= daysInMonth; d++) {
     const loopDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
     const dateStr = formatLocalDate(loopDate);
     const status = scheduleMap.get(dateStr);
     const isToday = dateStr === formatLocalDate(new Date());
     const isSelected = dateStr === formatLocalDate(selectedDateObj);

     let bgColor = 'bg-[#161925] hover:bg-[#1a1e2d] border-white/5';
     let statusIcon = null;

     if (status === 'scheduled') {
         bgColor = 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-400';
         statusIcon = <Dumbbell size={14} className="text-indigo-400" />;
     } else if (status === 'completed' || status === 'extra') {
         bgColor = 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
         statusIcon = <CheckCircle size={14} className="text-emerald-500" />;
     } else if (status === 'missed') {
         bgColor = 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400';
         statusIcon = <XCircle size={14} className="text-red-400" />;
     }

     if (isSelected) {
         bgColor += ' ring-2 ring-primary ring-offset-2 ring-offset-[#10121b]';
     }

     calendarGrid.push(
         <div
            key={d}
            onClick={() => setSelectedDateObj(loopDate)}
            className={`h-24 rounded-2xl border p-3 cursor-pointer transition flex flex-col justify-between ${bgColor} ${isToday ? 'border-primary/50 text-white shadow-inner' : 'text-gray-300'}`}
         >
            <div className="flex justify-between items-start">
               <span className={`font-bold ${isToday ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : ''}`}>
                  {d}
               </span>
               {statusIcon}
            </div>

            {status === 'scheduled' && <div className="text-[10px] uppercase font-bold tracking-wider mt-auto text-indigo-300">Planned</div>}
            {(status === 'completed' || status === 'extra') && <div className="text-[10px] uppercase font-bold tracking-wider mt-auto text-emerald-400">Done</div>}
            {status === 'missed' && <div className="text-[10px] uppercase font-bold tracking-wider mt-auto text-red-400">Missed</div>}
         </div>
     );
  }

  // --- Right Panel Detail Logic ---
  const selectedDateStr = formatLocalDate(selectedDateObj);
  const selectedStatus = scheduleMap.get(selectedDateStr) || 'rest';
  const isFuture = selectedDateObj > new Date(new Date().setHours(23,59,59,999));
  const isSelectedToday = selectedDateStr === todayStr;

  // Find sessions done on selected day
  const sessionsOnDate = (stats?.sessions || []).filter((s: any) => s.date === selectedDateStr).reverse();

  let rightPanelTheme = 'from-gray-800/40 to-[#161925] border-white/5';
  let panelHeader = 'Rest Day';
  let panelSubtitle = 'No workouts scheduled.';

  if (selectedStatus === 'completed' || selectedStatus === 'extra') {
      rightPanelTheme = 'from-emerald-900/40 to-[#161925] border-emerald-500/20';
      panelHeader = 'Completed!';
      panelSubtitle = 'You crushed your session today.';
  } else if (selectedStatus === 'scheduled') {
      rightPanelTheme = 'from-indigo-900/40 to-[#161925] border-indigo-500/30';
      panelHeader = isFuture ? 'Upcoming Plan' : 'Today\'s Plan';
      panelSubtitle = isFuture ? 'Rest up before this.' : "It's time to put in the work.";
  } else if (selectedStatus === 'missed') {
      rightPanelTheme = 'from-red-900/30 to-[#161925] border-red-500/20';
      panelHeader = 'Missed Session';
      panelSubtitle = 'It happens. Jump back into it today.';
  }

  return (
    <div className="w-full h-full flex bg-[#10121b] text-white selection:bg-primary/30">
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col p-8 overflow-y-auto">

        {/* Header Block & KPIs */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
               <CalendarIcon className="text-primary" size={32} /> Schedule & History
            </h1>
            <p className="text-gray-400">Track your consistency and review past workouts.</p>
          </div>

          <div className="flex gap-4">
             {/* Adherence */}
             <div className="bg-[#191c28] border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-4">
               <div className="bg-blue-500/20 p-2.5 rounded-full"><Target size={20} className="text-blue-500" /></div>
               <div>
                 <div className="text-gray-400 text-xs tracking-wide">Monthly Adherence</div>
                 <div className="font-bold text-xl">{adherence}%</div>
               </div>
             </div>
             {/* Streak */}
             <div className="bg-[#191c28] border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-4">
               <div className="bg-orange-500/20 p-2.5 rounded-full"><Flame size={20} className="text-orange-500" /></div>
               <div>
                 <div className="text-gray-400 text-xs tracking-wide">Current Streak</div>
                 <div className="font-bold text-xl">{currentStreak} <span className="text-sm text-gray-500 font-normal">days</span></div>
               </div>
             </div>
             {/* Total */}
             <div className="bg-[#191c28] border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-4">
               <div className="bg-purple-500/20 p-2.5 rounded-full"><Award size={20} className="text-purple-500" /></div>
               <div>
                 <div className="text-gray-400 text-xs tracking-wide">Active Days</div>
                 <div className="font-bold text-xl">{allCompletedDates.length}</div>
               </div>
             </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex gap-8">
            {/* Calendar Main View */}
            <div className="flex-1 bg-[#151722] border border-white/5 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-2xl font-bold">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </div>
                    <div className="flex items-center gap-4 bg-[#1e2231] rounded-full px-2 py-1 border border-white/5 shadow-inner">
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-white/5 rounded-full transition"><ChevronLeft size={20} /></button>
                        <button onClick={() => setCurrentMonth(new Date())} className="font-bold text-sm text-gray-400 hover:text-white px-2">Today</button>
                        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-white/5 rounded-full transition"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-4 mb-2 opacity-50 px-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-sm font-bold text-center tracking-widest uppercase">{day}</div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-7 gap-4 overflow-y-auto pr-2 pb-4 scrollbar-thin">
                    {calendarGrid}
                </div>
            </div>

            {/* Sub Panel Details */}
            <div className={`w-96 rounded-3xl border bg-gradient-to-br p-6 flex flex-col transition-all duration-500 shadow-2xl relative overflow-hidden ${rightPanelTheme}`}>

                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                <div className="relative z-10 text-gray-400 text-sm font-bold mb-1 uppercase tracking-widest">
                    {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="relative z-10 text-3xl font-bold mb-1">{panelHeader}</div>
                <div className="relative z-10 text-gray-400 text-sm mb-8">{panelSubtitle}</div>

                <div className="relative z-10 flex-1 overflow-y-auto scrollbar-none flex flex-col gap-3 pb-8">
                    {/* Render Session Details if Complete/Extra */}
                    {(selectedStatus === 'completed' || selectedStatus === 'extra') && sessionsOnDate.length > 0 && (
                       <>
                           <div className="grid grid-cols-2 gap-3 mb-4">
                               <div className="bg-[#10121b]/50 p-4 rounded-2xl border border-white/5">
                                  <div className="text-xs text-gray-400 mb-1">Exercises</div>
                                  <div className="font-bold text-xl">{sessionsOnDate.length}</div>
                               </div>
                               <div className="bg-[#10121b]/50 p-4 rounded-2xl border border-white/5">
                                  <div className="text-xs text-gray-400 mb-1">Calories (Est)</div>
                                  <div className="font-bold text-xl text-orange-400">
                                      {Math.round(sessionsOnDate.reduce((acc: number, s: any) => acc + (s.correct_reps * 0.45 + s.duration * 0.15), 0))} <span className="text-xs font-normal">kcal</span>
                                  </div>
                               </div>
                           </div>

                           <div className="text-sm font-bold mt-2 mb-1">Session Breakdown</div>
                           {sessionsOnDate.map((s: any, idx: number) => (
                              <div key={idx} className="bg-[#161925]/80 p-3.5 rounded-xl border border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="bg-primary/20 w-8 h-8 rounded-full flex items-center justify-center text-primary"><CheckCircle size={14} /></div>
                                     <div>
                                        <div className="font-bold text-sm tracking-wide">{s.exercise_name || s.name}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                           {s.duration > 0 ? `${s.duration}s Hold` : `${s.correct_reps} Reps`}
                                           {s.wrong_reps > 0 && <span className="text-red-400"> • {s.wrong_reps} bad form</span>}
                                        </div>
                                     </div>
                                  </div>
                                  <div className="font-bold text-sm">
                                      {Math.min(Math.round(((s.duration > 0 ? s.duration : s.correct_reps) / (s.target_val || 10)) * 100), 100)}%
                                  </div>
                              </div>
                           ))}
                       </>
                    )}

                    {/* Render Basic Warning for Missed */}
                    {selectedStatus === 'missed' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center flex flex-col items-center">
                            <XCircle size={40} className="text-red-400 mb-3" />
                            <div className="font-bold text-red-200">No Activity Recorded</div>
                            <div className="text-red-400/80 text-sm mt-2">You missed your scheduled workout on this day. Don't let it break your momentum!</div>
                        </div>
                    )}

                    {/* Render Future Plan Notice */}
                    {selectedStatus === 'scheduled' && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl text-center flex flex-col items-center">
                            <Dumbbell size={40} className="text-indigo-400 mb-3" />
                            <div className="font-bold text-indigo-200">{user?.fitness_level || 'Beginner'} Plan Assigned</div>
                            <div className="text-indigo-400/80 text-sm mt-2">Ready to hit your targets? Make sure you have your camera setup prepared.</div>
                        </div>
                    )}

                    {/* Render Just Rest Day */}
                    {selectedStatus === 'rest' && sessionsOnDate.length === 0 && (
                        <div className="text-center p-6 opacity-30 mt-10">
                            <CalendarIcon size={40} className="mx-auto mb-3" />
                            <div className="font-bold">No Activity</div>
                            <div className="text-sm">Enjoy your rest day!</div>
                        </div>
                    )}

                </div>

                {/* Bottom Action Button */}
                <div className="relative z-10 pt-4 border-t border-white/5">
                   {(isSelectedToday || selectedStatus === 'missed' || selectedStatus === 'scheduled') ? (
                       <button
                         onClick={() => navigate('/workouts')}
                         className="w-full bg-primary hover:bg-secondary text-white font-bold py-3.5 rounded-xl transition shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                       >
                         <Dumbbell size={18} /> {isSelectedToday ? 'Start Today\'s Workout' : 'Jump Back In (Workout)'}
                       </button>
                   ) : (
                       <button
                         onClick={() => navigate('/workouts')}
                         className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                       >
                         Explore Free Training
                       </button>
                   )}
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
