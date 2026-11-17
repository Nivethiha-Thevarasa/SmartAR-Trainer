import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { API } from '../api';
import { ArrowLeft, Flame, Bell, ChevronLeft, ChevronRight, Info, Play, Settings, Activity, Clock, Target, Star, BarChart2, Maximize } from 'lucide-react';

export default function TutorialScreen({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [workout, setWorkout] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Try to inherit constraints from WorkoutScreen (Plan). If direct access, fallback smartly.
  const target = location.state?.target || 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user && user.trainee_id) {
           const p = await API.user.getProfile(user.trainee_id);
           setProfile(p);
        }
        if (id) {
           const data = await API.workouts.getById(id);
           setWorkout(data);
        }
      } catch(e) {
        console.error("Failed loading tutorial data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (loading) return <div className="w-full h-full bg-[#0a0b10] flex items-center justify-center text-gray-400 font-bold">Loading Workout Details...</div>;
  if (!workout) return <div className="w-full h-full bg-[#0a0b10] flex items-center justify-center text-red-400">Workout not found.</div>;

  const isTimeBased = ['Plank', 'Cobra Stretch'].includes(workout.workout_name);
  const steps = workout.description ? workout.description.split('\n\n').filter(Boolean) : [];

  // Format difficulty bars
  const diffBars = [];
  for (let i = 0; i < 3; i++) {
     diffBars.push(
       <div key={i} className={`w-3.5 h-3.5 rounded-sm ${i < workout.difficulty ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'bg-gray-600'}`} />
     );
  }

  const handleStartWorkout = async () => {
     if (!location.state?.fromSession) {
         try { await API.session.create(user?.trainee_id || 1); } catch(e){}
     }
     navigate(`/session/${workout.workout_id}`, {
        state: {
           workoutName: workout.workout_name,
           target: target,
           exercises: location.state?.exercises || [workout],
           currentIndex: location.state?.currentIndex || 0
        }
     });
  };

  return (
    <div className="w-full h-full bg-[#0a0b10] text-white flex flex-col relative overflow-y-auto custom-scrollbar font-sans px-8 py-6">

       {/* Background ambient lighting */}
       <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

       {/* IN-APP HEADER matching reference EXACTLY */}
       <div className="w-full flex items-center justify-between mb-8 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition text-gray-300 hover:text-white">
                <ArrowLeft size={22} />
             </button>
             <div>
                <div className="flex items-center gap-3">
                   <h1 className="text-[28px] font-bold tracking-tight">{workout.workout_name}</h1>
                   <Activity size={20} className="text-primary" />
                </div>
                <div className="text-sm font-semibold text-gray-400 tracking-wide mt-1">{workout.category}</div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             {/* Dynamic Nav Pills injected per user request */}
             <div className="flex items-center bg-[#13151f] rounded-full p-1 border border-white/5 shadow-lg hidden md:flex">
                <button onClick={() => navigate('/dashboard')} className="px-5 py-1.5 text-sm font-semibold text-gray-400 hover:text-white transition rounded-full hover:bg-white/5">Dashboard</button>
                <button onClick={() => navigate('/workouts')} className="px-5 py-1.5 text-sm font-semibold text-gray-400 hover:text-white transition rounded-full hover:bg-white/5">Workout</button>
                <button onClick={() => navigate('/analytics')} className="px-5 py-1.5 text-sm font-semibold text-gray-400 hover:text-white transition rounded-full hover:bg-white/5">Analysis</button>
                <button onClick={() => navigate('/profile')} className="px-5 py-1.5 text-sm font-semibold text-gray-400 hover:text-white transition rounded-full hover:bg-white/5">Profile</button>
             </div>

             <div className="flex items-center gap-3 bg-[#13151f] border border-white/5 px-6 py-2 rounded-full shadow-lg">
                <Flame size={20} className="fill-orange-500 text-orange-500" />
                <div className="flex flex-col">
                   <div className="font-bold text-lg leading-tight">7</div>
                   <div className="text-[10px] uppercase text-gray-400 font-bold tracking-widest">Day Streak</div>
                </div>
             </div>

             <div className="bg-gradient-to-r from-[#5939db] to-[#3f2da8] rounded-2xl p-3 px-6 flex items-center gap-4 shadow-[0_4px_20px_rgba(89,57,219,0.4)]">
                 <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                     <BarChart2 size={16} className="text-white" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] text-white/70 font-semibold tracking-widest uppercase">Current Plan</span>
                    <span className="font-bold text-sm tracking-wide">{profile?.fitness_level || 'Beginner'}</span>
                 </div>
             </div>

             <button className="relative p-3 rounded-full bg-[#13151f] border border-white/5 hover:bg-white/5 transition">
                 <Bell size={20} className="text-gray-300" />
                 <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-[#13151f]" />
             </button>
          </div>
       </div>

       {/* MAIN PANES */}
       <div className="flex gap-6 flex-1 w-full mx-auto relative z-10 shrink-0">

          {/* LEFT PANE - Massive 3D media representation */}
          <div className="w-[50%] bg-[#13141f] border border-white/5 rounded-[32px] flex flex-col p-6 shadow-2xl relative overflow-hidden group">
             {/* Graph paper inner bounds aesthetic */}
             <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

             {/* Graphic Top Overlay HUD */}
             <div className="flex items-center justify-between relative z-10 mb-4">
                 <div className="flex items-center gap-4">
                     <div className="bg-[#241a49] text-primary px-4 py-1.5 rounded-xl text-xs font-bold tracking-wider">
                         ID {workout.workout_id}
                     </div>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Difficulty</span>
                        <div className="flex gap-1">
                           {diffBars}
                        </div>
                     </div>
                 </div>
                 <button className="p-2 bg-[#1b1c2b] text-gray-400 rounded-lg hover:text-white transition">
                     <Maximize size={16} className="rotate-45" />
                 </button>
             </div>

             {/* Tutorial Video Area */}
             <div className="flex-1 flex items-center justify-center relative mt-4">
                 <button className="absolute left-0 w-12 h-12 bg-[#1b1c2b]/80 border border-white/5 hover:bg-primary backdrop-blur-md rounded-full flex items-center justify-center transition shadow-lg z-10">
                    <ChevronLeft size={24} className="text-white" />
                 </button>

                 {/* Premium Video Player */}
                 {!videoError ? (
                    <div className="w-full h-full min-h-[350px] relative rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 group bg-[#0a0b10]">
                       <video
                           autoPlay
                           loop
                           muted
                           playsInline
                           src={(() => {
                               const cleanName = workout.workout_name?.trim().toLowerCase() || '';
                               if (cleanName === 'push ups') return encodeURI('/assets/Push ups.mp4');
                               if (cleanName === 'jumping jacks') return encodeURI('/assets/Jumping jacks.mp4');
                               if (cleanName === 'cobra stretch') return encodeURI('/assets/Cobra stretch.mp4');
                               if (cleanName === 'crunches') return '/assets/Crunches.mp4';
                               if (cleanName === 'plank') return '/assets/Plank.mp4';
                               if (cleanName === 'squats') return '/assets/Squats.mp4';
                               return encodeURI(`/assets/${workout.workout_name.trim().charAt(0).toUpperCase() + workout.workout_name.trim().slice(1).toLowerCase()}.mp4`);
                           })()}
                           onError={() => setVideoError(true)}
                           className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    </div>
                 ) : (
                    /* Visual Silhouette mapping exactly to reference scale */
                    <div className="w-[300px] h-[350px] relative mt-10">
                        <div className="absolute top-[8%] left-[45%] w-8 h-10 bg-slate-300 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                        <div className="absolute top-[18%] left-[25%] w-36 h-40 bg-orange-600/80 blur-sm rounded-2xl" />
                        <div className="absolute top-[18%] left-[25%] w-36 h-40 bg-slate-200 border-2 border-orange-500 rounded-2xl shadow-[0_0_40px_rgba(249,115,22,0.3)] opacity-90" />
                        {/* Arms wide */}
                        <div className="absolute top-[18%] left-[-15%] w-10 h-32 bg-orange-400/80 blur-sm rounded-full -rotate-[50deg]" />
                        <div className="absolute top-[18%] right-[-15%] w-10 h-32 bg-orange-400/80 blur-sm rounded-full rotate-[50deg]" />
                        {/* Legs spread */}
                        <div className="absolute top-[55%] left-[10%] w-12 h-40 bg-orange-500/60 blur-sm rounded-full -rotate-[20deg]" />
                        <div className="absolute top-[55%] right-[10%] w-12 h-40 bg-orange-500/60 blur-sm rounded-full rotate-[20deg]" />
                    </div>
                 )}

                 <button className="absolute right-0 w-12 h-12 bg-[#1b1c2b]/80 border border-white/5 hover:bg-primary backdrop-blur-md rounded-full flex items-center justify-center transition shadow-lg z-10">
                    <ChevronRight size={24} className="text-white" />
                 </button>
             </div>

             {/* Tutorial Indicator Box at bottom */}
             <div className="mt-auto bg-[#0a0b10]/40 backdrop-blur-sm border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full border border-primary/50 flex items-center justify-center shrink-0">
                    <Info size={16} className="text-primary" />
                 </div>
                 <div>
                    <div className="text-sm font-bold tracking-wide">Tutorial</div>
                    <div className="text-xs font-semibold text-gray-400">Follow the guide to perform the exercise correctly</div>
                 </div>
             </div>
          </div>

          {/* RIGHT PANE - Detailed Steps */}
          <div className="w-[50%] flex flex-col gap-6 shrink-0 h-full">

             {/* Exercise Overview Block */}
             <div className="bg-[#13141f] border border-white/5 rounded-[32px] p-8 flex flex-col shadow-2xl flex-1 max-h-[480px] overflow-y-auto custom-scrollbar">
                 <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-indigo-400" />
                     </div>
                     <h2 className="text-lg font-bold">Exercise Overview</h2>
                 </div>
                 <p className="text-sm font-semibold text-gray-400 leading-relaxed mb-6">
                    A classic {workout.category.toLowerCase()} exercise that improves tracking coordination and builds foundational resistance parameters effectively.
                 </p>

                 {/* 3 Metric Cards */}
                 <div className="flex gap-4 mb-8">
                     <div className="flex-1 bg-[#0f1018] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Clock size={20} className="text-primary mb-2" />
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Duration</div>
                        <div className="font-bold font-mono tracking-wide">00:45</div>
                     </div>
                     <div className="flex-1 bg-[#0f1018] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Flame size={20} className="text-orange-500 mb-2" />
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Calories</div>
                        <div className="font-bold flex items-center gap-1 font-mono tracking-wide">{workout.calories_min} - {workout.calories_max} <span className="text-[10px] text-gray-500 font-sans tracking-tight">kcal</span></div>
                     </div>
                     <div className="flex-1 bg-[#0f1018] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
                        <Target size={20} className="text-blue-400 mb-2" />
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Muscles</div>
                        <div className="font-bold text-sm text-center">{workout.category.split(' • ')[0]}</div>
                     </div>
                 </div>

                 <h3 className="text-base font-bold mb-4">How to Perform</h3>

                 <div className="flex flex-col gap-4">
                     {steps.map((step: string, index: number) => (
                         <div key={index} className="flex gap-4 items-start">
                             <div className="w-6 h-6 rounded-full bg-[#2a1b5d] text-xs font-bold flex items-center justify-center text-[#9b83ea] shrink-0 mt-0.5 shadow-inner">
                                {index + 1}
                             </div>
                             <p className="text-sm font-semibold text-gray-300 leading-snug">{step.trim()}</p>
                         </div>
                     ))}
                 </div>
             </div>

             {/* Middle parameter Adjustments and Start Button bar */}
             <div className="flex gap-4 items-stretch h-[80px]">
                 {/* Adjustments */}
                 <div className="bg-[#13141f] border border-white/5 rounded-2xl flex-1 px-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                       <span className="text-sm font-semibold text-gray-400">Sets</span>
                       <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition font-bold text-gray-400 hover:text-white">-</button>
                          <span className="font-bold font-mono">3</span>
                          <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition font-bold text-gray-400 hover:text-white">+</button>
                       </div>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex items-center gap-4">
                       <span className="text-sm font-semibold text-gray-400">{isTimeBased ? 'Duration' : 'Reps'}</span>
                       <div className="flex items-center gap-3">
                          <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition font-bold text-gray-400 hover:text-white">-</button>
                          <span className="font-bold font-mono">{target}</span>
                          <button className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition font-bold text-gray-400 hover:text-white">+</button>
                       </div>
                    </div>
                 </div>

                 {/* Giant Start Button exactly mapping reference green button */}
                 <button
                     onClick={handleStartWorkout}
                     className="w-[280px] rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-white flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(34,197,94,0.3)] transition transform hover:scale-[1.02]"
                 >
                     <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center shadow-lg">
                        <Play size={16} className="fill-white translate-x-[1px]" />
                     </div>
                     <span className="font-bold text-lg tracking-wide shadow-none">Start Workout</span>
                 </button>
             </div>

             {/* Footer Actions Row */}
             <div className="flex gap-4 items-stretch h-[70px]">
                 <div className="bg-[#13141f] border border-white/5 w-[200px] rounded-2xl flex items-center px-5 gap-4 shadow-lg shrink-0">
                     <Star size={24} className="text-primary fill-primary/20" />
                     <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-400">Next Up</span>
                        <span className="font-bold text-sm tracking-wide">Rest 00:30</span>
                     </div>
                 </div>

                 <div className="bg-[#13141f] border border-white/5 flex-1 rounded-2xl px-6 flex items-center justify-between shadow-lg">
                    <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Progress</span>
                    <div className="flex-1 mx-4 h-1.5 bg-[#0a0b10] rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-[0%]" />
                    </div>
                    <span className="text-xs font-bold">0%</span>
                 </div>

                 <button className="px-6 bg-[#13141f] border border-white/5 rounded-2xl flex items-center gap-3 text-sm font-bold text-gray-300 hover:text-white transition hover:bg-white/5 shadow-lg shrink-0">
                     <span className="w-6 h-6 border-2 border-currentColor rounded flex items-center justify-center shrink-0">
                        <div className="w-2.5 h-2.5 bg-currentColor rounded-full" />
                     </span> Switch Camera
                 </button>

                 <button className="w-[70px] bg-[#13141f] border border-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition hover:bg-white/5 shadow-lg shrink-0">
                     <Settings size={20} />
                 </button>
             </div>

          </div>
       </div>

    </div>
  );
}
