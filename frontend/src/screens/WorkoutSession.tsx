import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { API } from '../api';
import { ArrowLeft, Play, Pause, Square, Activity, Video, Maximize, Minimize, Scan, Flame, BookOpen, Volume2 } from 'lucide-react';

export default function WorkoutSession({ user }: { user: any }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [cameraActive, setCameraActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasStopped, setHasStopped] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const unityContainerRef = useRef<HTMLDivElement>(null);

  const workoutName = location.state?.workoutName || 'Workout';
  const workoutTarget = location.state?.target || 10;

  const isTimeBased = ['Plank', 'Cobra Stretch'].includes(workoutName);

  // Timer state
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (cameraActive && !paused) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cameraActive, paused]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startSession = async () => {
    try {
      // Retrieve Windows HWND via Electron preload IPC
      const hwnd = (window as any).electronAPI?.getHwnd
        ? await (window as any).electronAPI.getHwnd()
        : 0;

      // Send to FastAPI wrapper so Python sets Parent.
      let width = 640;
      let height = 480;
      let x = 0;
      let y = 0;
      if (unityContainerRef.current) {
          const rect = unityContainerRef.current.getBoundingClientRect();
          width = Math.round(rect.width);
          height = Math.round(rect.height);
          x = Math.round(rect.x);
          y = Math.round(rect.y);
      }

      const payload = {
          hwnd: typeof hwnd === 'bigint' ? Number(hwnd) : hwnd, // Safety cast if necessary
          workout_name: workoutName,
          user_gender: user?.gender || "Male",
          targetWidth: width,
          targetHeight: height,
          x,
          y
      };

      await API.unity.startSession(payload.hwnd, payload.workout_name, payload.user_gender, payload.targetWidth, payload.targetHeight, payload.x, payload.y);
      setCameraActive(true);
      setPaused(false);
    } catch (e: any) {
      alert("Failed to start Unity process: " + e.message);
    }
  };

  const endSession = async () => {
    try {
      if (cameraActive) {
         await API.unity.stopSession();
      }
      setCameraActive(false);
    } catch (e: any) {
      console.error(e);
    }
  };

  const abortSession = async () => {
     await endSession();
     navigate(-1);
  };

  // Clean up unity and reset states on route param change
  useEffect(() => {
    setCameraActive(false);
    setHasStarted(false);
    setHasStopped(false);
    setVideoError(false);
    setIsExpanded(false);
    setSeconds(0);
    setPaused(false);

    return () => {
      API.unity.stopSession().catch(e => console.error("Cleanup error", e));
    };
  }, [id]);

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div className="w-full h-full bg-[#0e0f15] text-white flex flex-col relative overflow-hidden font-sans">
       {/* TOP NAV BAR - Custom to Session */}
       <div className="w-full h-20 px-8 flex items-center justify-between border-b border-white/5 bg-[#12131a] relative z-20 shrink-0">
          <div className="flex items-center gap-6">
             <button onClick={abortSession} className="text-primary hover:text-white transition">
                <ArrowLeft size={24} />
             </button>
             <div>
                <div className="flex items-center gap-3">
                   <h1 className="text-xl font-bold">{workoutName}</h1>
                   <Activity size={18} className="text-primary" />
                </div>
                <div className="text-xs text-gray-400 font-semibold tracking-wide">Full Body • Cardio</div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <button className="px-6 py-2.5 rounded-xl bg-[#2b2158] hover:bg-primary transition text-sm font-semibold text-white">
                Workout
             </button>
             <button className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition text-gray-300">
                Analytics
             </button>
             <button className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm font-semibold transition text-gray-300">
                Profile
             </button>
             <div className="flex items-center gap-2 ml-4 px-4 py-2 bg-[#1b1c2b] border border-primary/30 rounded-xl text-primary font-bold tracking-widest shadow-inner">
                {formatTime(seconds)} <Play size={14} className="fill-primary" />
             </div>
          </div>
       </div>

       {/* MAIN CONTENT SPLIT */}
       <div className="flex-1 w-full mx-auto p-6 flex gap-6 relative z-10 overflow-hidden">

          {/* LEFT PANE - Exercise Tutorial & Progress */}
          {!isExpanded && (
          <div className="w-[360px] flex flex-col gap-6 shrink-0 h-full">

             {/* Exercise Tutorial Card */}
             <div className="bg-[#151722] border border-white/5 rounded-3xl p-6 flex flex-col shadow-xl h-[420px] shrink-0">
                {/* Tabs Removed per user request */}

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center relative mb-4">
                   <div className="flex w-full h-full items-start gap-4">
                      {/* Character Placeholder Graphic using generic silhouette */}
                      <div className="flex-1 h-full flex items-center justify-center relative">
                         {!videoError ? (
                            <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/5 group bg-[#0a0b10]">
                               <video
                                   autoPlay
                                   loop
                                   muted
                                   playsInline
                                   src={(() => {
                                       const cleanName = workoutName?.trim().toLowerCase() || '';
                                       if (cleanName === 'push ups' || cleanName === 'push up' || cleanName === 'push-up') return encodeURI('/assets/Push ups.mp4');
                                       if (cleanName === 'jumping jacks' || cleanName === 'jumping jack') return encodeURI('/assets/Jumping jacks.mp4');
                                       if (cleanName === 'cobra stretch') return encodeURI('/assets/Cobra stretch.mp4');
                                       if (cleanName === 'crunches') return '/assets/Crunches.mp4';
                                       if (cleanName === 'plank') return '/assets/Plank.mp4';
                                       if (cleanName === 'squats' || cleanName === 'squat') return '/assets/Squats.mp4';
                                       return encodeURI(`/assets/${workoutName.trim().charAt(0).toUpperCase() + workoutName.trim().slice(1).toLowerCase()}.mp4`);
                                   })()}
                                   onError={() => setVideoError(true)}
                                   className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                               />
                            </div>
                         ) : (
                             /* Graphic placeholder visually matching reference generic model */
                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-75">
                                 <div className="w-16 h-16 rounded-full bg-yellow-400 absolute top-[10%]" />
                                 <div className="w-24 h-32 bg-yellow-500 rounded-lg absolute top-[35%]" />
                                 <div className="w-6 h-32 bg-yellow-500 rounded-full absolute top-[75%] left-[25%] -rotate-12" />
                                 <div className="w-6 h-32 bg-yellow-500 rounded-full absolute top-[75%] right-[25%] rotate-12" />
                                 <div className="w-4 h-24 bg-yellow-400 rounded-full absolute top-[35%] left-[0%] -rotate-[60deg]" />
                                 <div className="w-4 h-24 bg-yellow-400 rounded-full absolute top-[35%] right-[0%] rotate-[60deg]" />
                             </div>
                         )}
                      </div>
                   </div>
                </div>

                <button
                   onClick={() => navigate(`/tutorial/${id}`, { state: { target: workoutTarget, exercises: location.state?.exercises, currentIndex: location.state?.currentIndex, fromSession: true } })}
                   className="w-full py-4 mt-auto rounded-xl border border-white/10 hover:bg-white/5 transition flex items-center justify-center gap-2 text-sm font-bold text-gray-300">
                   <BookOpen size={18} /> Tutorial
                </button>
             </div>

             {/* Exercise Progress Card */}
             <div className="bg-[#151722] border border-white/5 rounded-3xl p-6 shadow-xl flex-1 max-h-[160px]">
                <h3 className="font-bold mb-4">Exercise Progress</h3>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      {/* Set Circle Indicator */}
                      <div className="w-14 h-14 rounded-full border-4 border-[#2b2158] flex items-center justify-center relative">
                         <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-indigo-500 border-r-transparent border-b-transparent -rotate-45" />
                         <span className="font-bold text-sm">1 / 3</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="text-xl font-bold">1 <span className="text-sm font-normal text-gray-400">3</span></span>
                         <span className="text-xs text-gray-400 uppercase tracking-widest">Sets</span>
                      </div>
                   </div>

                   <div className="flex flex-col items-center">
                      <span className="text-xl font-bold">10 <span className="text-sm font-normal text-gray-400">/ {workoutTarget}</span></span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">{isTimeBased ? 'Sec' : 'Reps'}</span>
                   </div>

                   <div className="flex flex-col items-center pr-2">
                      <span className="text-2xl font-bold">45</span>
                      <span className="text-xs text-gray-400 uppercase tracking-widest">Sec</span>
                   </div>
                </div>
             </div>

             {/* Bottom Session Controls */}
             <div className="flex gap-4 shrink-0">
                {!hasStarted ? (
                   <button
                      onClick={() => { startSession(); setHasStarted(true); }}
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-green-600 text-white rounded-2xl font-bold shadow-lg transition">
                      <Play size={20} className="fill-white" /> Start Workout
                   </button>
                ) : !hasStopped ? (
                   <button
                      onClick={() => { endSession(); setHasStopped(true); }}
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-[#f43f5e] hover:bg-[#e11d48] text-white rounded-2xl font-bold shadow-lg transition">
                      <Square size={20} className="fill-white" /> Stop Workout
                   </button>
                ) : location.state?.exercises && location.state?.currentIndex < location.state?.exercises.length - 1 ? (
                   <button
                      onClick={async () => {
                          await endSession();
                          const nextEx = location.state.exercises[location.state.currentIndex+1];
                          navigate(`/session/${nextEx.workout_id}`, {
                              state: {
                                  workoutName: nextEx.name || nextEx.workout_name,
                                  target: nextEx.target,
                                  exercises: location.state.exercises,
                                  currentIndex: location.state.currentIndex + 1
                              }
                          });
                      }}
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-primary hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(102,126,234,0.3)] transition">
                      <Activity size={20} /> Next Workout
                   </button>
                ) : (
                   <button
                      onClick={async () => {
                          try { await endSession(); } catch(e){}
                          try { await API.session.save(); } catch(e){}
                          navigate('/analytics');
                      }}
                      className="flex-1 py-4 flex items-center justify-center gap-2 bg-[#2b2158] hover:bg-[#3d3170] text-white rounded-2xl font-bold shadow-lg transition">
                      <Flame size={20} className="fill-orange-500 text-orange-500" /> End Plan \u0026 Save
                   </button>
                )}

                <button
                   onClick={() => setPaused(!paused)}
                   disabled={!hasStarted || hasStopped}
                   className="w-[140px] flex items-center justify-center gap-2 bg-[#1b1c2b] hover:bg-[#25273b] border border-white/5 text-white rounded-2xl font-bold transition disabled:opacity-50">
                   {paused ? <Play size={20} className="fill-current" /> : <Pause size={20} className="fill-current" />}
                   {paused ? 'Resume' : 'Pause'}
                </button>
             </div>
          </div>
          )}

          {/* RIGHT PANE - Unity Camera Engine & Overlays */}
          <div className="flex-1 flex flex-col relative h-full">

             {/* The Native Win32 / HTML Unity wrapper box covering exact dimensions */}
             <div
                 ref={unityContainerRef}
                 className={`absolute inset-0 rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center z-0 ${cameraActive ? 'bg-transparent' : 'bg-[#000]'}`}
             >
                 {/* Fallback visual if native engine is slow bridging. We want it completely black logically until setParent. */}
                 {!cameraActive && (
                    <div className="text-gray-500 font-bold tracking-widest uppercase flex flex-col items-center gap-4">
                       <Scan size={48} className="animate-pulse" />
                       Initializing Pose Tracking Engine...
                    </div>
                 )}
             </div>

             {/*
                 Z-10 OVERLAYS
                 By keeping pointing events largely transparent except on buttons, the native engine can still potentially register clicks (though mostly read-only tracker).
             */}
             <div className="absolute inset-0 z-10 rounded-3xl pointer-events-none flex flex-col justify-between p-6">

                {/* Top Overlay Bar */}
                <div className="flex justify-between items-start pointer-events-auto">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                         <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                         <span className="font-bold text-sm text-white">Live</span>
                      </div>
                   </div>

                   <div className="flex gap-2">
                      <button className="w-12 h-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition group disabled:opacity-50">
                          <Video size={20} />
                      </button>
                      <button onClick={() => setIsExpanded(!isExpanded)} className="w-12 h-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition group">
                          {isExpanded ? <Minimize size={20} /> : <Maximize size={20} />}
                      </button>
                      <button className="w-12 h-12 bg-[#1b1c2b]/80 backdrop-blur-md border border-primary/50 text-primary rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition">
                          <Activity size={20} />
                      </button>
                   </div>
                </div>

                {/* Bottom Instruction Bar */}
                <div className="w-full bg-[#151722]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between pointer-events-auto shadow-lg mt-auto translate-y-2">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#2b2158] flex items-center justify-center">
                         <Activity size={18} className="text-primary" />
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-gray-200">
                         Keep your arms straight and land softly on your feet.
                      </p>
                   </div>
                   <button className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 transition">
                      <Volume2 size={20} />
                   </button>
                </div>

             </div>

          </div>

       </div>
    </div>
  );
}
