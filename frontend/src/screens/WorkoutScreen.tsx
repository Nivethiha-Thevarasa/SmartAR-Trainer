import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { Play, ChevronRight, Activity, Zap, Medal, User as UserIcon, Camera } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function WorkoutScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    if (!user?.trainee_id) return;

    const loadData = async () => {
      try {
        const userData: any = await API.user.getProfile(user.trainee_id);
        setProfile(userData);

        // Load the assigned plan based on the user's current plan_id
        const planData: any = await API.workouts.getPlan(userData.plan_id);
        setExercises(planData);
      } catch (err) {
        console.error("Failed to load workout screen data:", err);
      } finally {
         setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const handleStartWorkout = async () => {
     if (!sessionStorage.getItem('cameraGranted')) {
         setShowCameraModal(true);
         return;
     }
     executeStart();
  };

  const executeStart = async () => {
     try { await API.session.create(user?.trainee_id || 1); } catch (e) {}
     if (exercises.length > 0) {
         navigate(`/session/${exercises[0].workout_id}`, {
            state: {
               workoutName: exercises[0].name,
               target: exercises[0].target,
               exercises: exercises,
               currentIndex: 0
            }
         });
     }
  };

  if (loading) {
     return <div className="w-full h-full flex justify-center items-center text-white bg-[#0e0f15]">Loading Plan...</div>;
  }

  return (
    <div className="w-full h-full flex bg-[#10121b] text-white selection:bg-primary/30">
       <Sidebar onLogout={onLogout} />

       {/* MAIN CONTENT SPLIT */}
       <div className="flex-1 flex flex-col relative overflow-hidden font-sans bg-[#0e0f15]">
          {/* Background ambient lighting */}
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

          <div className="flex-1 w-full max-w-7xl mx-auto p-10 flex gap-8 relative z-10 overflow-y-auto custom-scrollbar">

          {/* LEFT PANE */}
          <div className="w-[340px] flex flex-col gap-6 shrink-0">

             {/* Greeting Card */}
             <div className="bg-[#151722] border border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
                 <div className="w-16 h-16 rounded-full overflow-hidden border border-primary/30 shrink-0 bg-[#2a2c39]">
                     {profile?.profile_image || user?.profile_image ? (
                        <img src={profile?.profile_image || user?.profile_image} className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex justify-center items-center font-bold text-xl">{profile?.name ? profile.name[0].toUpperCase() : 'U'}</div>
                     )}
                 </div>
                 <div>
                    <h2 className="text-xl font-bold">Hey, <span className="text-primary">{profile?.name || user?.name || "User"}!</span> 👋</h2>
                    <p className="text-xs text-gray-400 mt-1 leading-snug">Your journey to a stronger you starts now.</p>
                 </div>
             </div>

             {/* Current Plan Card */}
             <div className="bg-gradient-to-r from-[#1a1c29] to-[#1f1d33] border border-white/5 rounded-3xl p-6 flex items-center gap-5 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 blur-[50px] rounded-full pointer-events-none" />
                <div className="w-12 h-12 rounded-xl bg-[#2a2742] flex items-center justify-center border border-white/5 shrink-0 z-10">
                   <Medal size={22} className="text-gray-300" />
                </div>
                <div className="flex-1 z-10">
                   <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Current Plan</div>
                   <div className="text-xl font-bold flex items-center justify-between">
                       {profile?.fitness_level || "Beginner"}
                       <span className="text-xs font-normal text-gray-400">Keep it up! 🔥</span>
                   </div>
                </div>
             </div>

             {/* Promo Challenge Card */}
             <div className="bg-[#11121d] border border-white/5 rounded-3xl p-8 flex flex-col flex-1 shadow-2xl relative overflow-hidden min-h-[300px]">
                {/* Wavy Graph Illustration Simulation */}
                <div className="absolute bottom-0 left-0 right-0 h-40 opacity-80 pointer-events-none">
                   <svg viewBox="0 0 400 150" fill="none" className="w-full h-full" preserveAspectRatio="none">
                      <path d="M0 100 C 50 150, 100 20, 200 90 C 300 160, 350 40, 400 60 L 400 150 L 0 150 Z" className="fill-primary/10" />
                      <path d="M0 100 C 50 150, 100 20, 200 90 C 300 160, 350 40, 400 60" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
                      {/* Sparkles */}
                      <circle cx="200" cy="90" r="4" fill="white" className="drop-shadow-[0_0_8px_white]" />
                      <circle cx="100" cy="50" r="3" fill="#667eea" />
                      <circle cx="320" cy="110" r="2" fill="#667eea" />
                   </svg>
                </div>

                <div className="w-12 h-12 rounded-full bg-[#1e1c31] border border-white/10 flex items-center justify-center mb-6 shadow-inner relative z-10">
                   <Zap size={20} className="text-primary" />
                </div>
                <h3 className="text-3xl font-bold leading-tight relative z-10">
                   Are you ready to <br/>
                   <span className="text-primary drop-shadow-[0_0_10px_rgba(102,126,234,0.4)]">beat your challenge</span><br/>
                   today?
                </h3>
                <p className="text-sm text-gray-400 mt-4 relative z-10">Let's start and crush your goals! 💪</p>
             </div>
          </div>

          {/* RIGHT PANE - EXERCISES */}
          <div className="flex-1 flex flex-col">
             <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-[#1b1d29] border border-white/5 flex items-center justify-center shrink-0">
                      <Play size={24} className="text-white fill-white" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-bold mb-1">Today's Workout Plan</h2>
                      <p className="text-sm text-gray-400">Complete each exercise in sequence to finish your session.</p>
                   </div>
                </div>
                <div className="bg-[#151722] border border-white/5 rounded-2xl px-6 py-3 flex items-center gap-3">
                   <div className="text-gray-400"><Activity size={18} /></div>
                   <div>
                       <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Est. Time</div>
                       <div className="text-sm font-bold">~20 Min</div>
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
                {exercises.map((ex, index) => {
                   const isTimeBased = ['Plank', 'Cobra Stretch'].includes(ex.name);
                   const targetLabel = isTimeBased ? `${ex.target} Sec` : `${ex.target} Rep${ex.target > 1 ? 's' : ''}`;

                   return (
                     <div
                        key={ex.workout_id}
                        onClick={() => navigate(`/tutorial/${ex.workout_id}`, { state: { target: ex.target, exercises, currentIndex: index } })}
                        className="flex items-center gap-6 bg-[#161824] hover:bg-[#1a1c29] border border-white/5 hover:border-primary/30 transition-all rounded-3xl p-4 cursor-pointer group"
                     >
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold shadow-[0_0_15px_rgba(102,126,234,0.3)] group-hover:scale-110 transition shrink-0">
                          {index + 1}
                        </div>
                        {/* Generic human silhouette placeholder representing the exercise icon in reference */}
                        <div className="w-12 h-12 flex items-center justify-center text-gray-500 opacity-60">
                           <UserIcon size={32} />
                        </div>
                        <div className="flex-1">
                           <div className="font-bold text-lg">{ex.name}</div>
                        </div>
                        <div className="px-5 py-2 rounded-xl bg-white/5 border border-white/5 text-sm font-semibold tracking-wide group-hover:bg-primary/20 group-hover:text-primary transition">
                           {targetLabel}
                        </div>
                        <div className="text-gray-500 group-hover:text-white transition px-2">
                           <ChevronRight size={20} />
                        </div>
                     </div>
                   );
                })}
             </div>

              <div className="mt-4 shrink-0">
                <button onClick={handleStartWorkout} className="w-full py-5 rounded-2xl bg-gradient-to-r from-primary to-blue-500 text-white font-bold text-lg shadow-[0_4px_25px_rgba(102,126,234,0.5)] hover:opacity-90 hover:scale-[1.01] transition-all flex items-center justify-center gap-3">
                   Start Workout <ChevronRight size={22} className="stroke-[3]" />
                </button>
             </div>
          </div>
       </div>

       {/* Camera Permission Modal */}
       {showCameraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCameraModal(false)} />

             <div className="bg-[#151722] border border-white/10 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(102,126,234,0.3)]">
                   <Camera size={36} className="text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-3 tracking-tight">Camera Permission</h3>
                <p className="text-gray-400 mb-8 text-sm leading-relaxed px-4">
                   SmartAR Trainer requires camera access to use <strong className="text-white">Unity Pose Tracking</strong>. We use your camera strictly for local stance-estimation to optimize your workout.
                </p>

                <div className="w-full flex gap-4">
                   <button
                      onClick={() => setShowCameraModal(false)}
                      className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 transition"
                   >
                      Cancel
                   </button>
                   <button
                      onClick={() => {
                          sessionStorage.setItem('cameraGranted', 'true');
                          setShowCameraModal(false);
                          executeStart();
                      }}
                      className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-indigo-500 text-white font-bold transition shadow-[0_0_15px_rgba(102,126,234,0.4)]"
                   >
                      Allow Access
                   </button>
                </div>
             </div>
          </div>
       )}
    </div>
  </div>
  );
}
