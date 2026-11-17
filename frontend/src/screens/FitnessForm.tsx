import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../api';
import { ArrowLeft, ArrowRight, UserCircle2, Activity, Target } from 'lucide-react';
import clsx from 'clsx';

export default function FitnessForm({ onLogin }: { onLogin: (data: any) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    dob: "2000-01-01",
    gender: "Male" as "Male"|"Female",
    height: "175",
    weight: "70",
    workout_experience: "Yes" as "Yes"|"No",
    workout_duration: "30",
    weekly_frequency: "3",
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");

      const fitnessPayload = {
         ...formData,
         workout_experience: formData.workout_experience === 'Yes' ? 'Intermediate' : 'Beginner',
      };

      const res: any = await API.auth.register({
        name: authData.name || "User",
        email: authData.email || "",
        password: authData.password || "Password123!",
        fitness_data: fitnessPayload
      });

      localStorage.removeItem("auth");

      // Auto login the newly fully-registered user with real database assigned stats
      const userProfile: any = await API.user.getProfile(res.trainee_id);
      onLogin(userProfile);

      if (res.status === 'INACTIVE' || !userProfile.email_verified) {
          navigate("/verify-email");
      } else {
          navigate("/dashboard");
      }

    } catch (err: any) {
      setError(err.message || 'Error creating account. Please try again.');
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
       if (!formData.dob || !formData.height || !formData.weight) {
           setError("Please fill all required fields in Step 1."); return;
       }
       setError('');

       if (formData.workout_experience === 'No') {
           // Skip Step 2 because the backend ML forces Plan 1/Beginner 1 automatically natively
           handleSubmit();
       } else {
           setStep(2);
       }
    } else {
       if (!formData.workout_duration || !formData.weekly_frequency) {
           setError("Please complete all sections to generate your plan."); return;
       }
       handleSubmit();
    }
  };

  return (
    <div className="w-full h-full flex bg-[#10121b] text-white overflow-hidden relative selection:bg-primary/30">
      {/* Decorative gradients mirroring the exact reference */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 blur-[130px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/10 blur-[130px] rounded-full -translate-x-1/2 translate-y-1/3 pointer-events-none" />

      {/* Left Pane Branding */}
      <div className="w-[45%] h-full flex flex-col justify-center p-16 z-10 relative">
        <h1 className="text-5xl font-bold leading-tight mb-8">
          Build a <br/><span className="text-primary drop-shadow-[0_0_15px_rgba(102,126,234,0.5)]">Stronger<br/>You </span>💪
        </h1>
        <p className="text-gray-400 text-lg max-w-md mb-12">
          Personalized workouts,<br/> smarter tracking, better<br/> results.
        </p>

        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center p-4 rounded-full bg-[#1e1b2f] border border-white/5 shadow-inner">
               <UserCircle2 size={24} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg">Personalized <span className="text-primary">Plans</span></div>
              <div className="text-gray-500 text-sm">Workouts tailored to you</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center p-4 rounded-full bg-[#1e1b2f] border border-white/5 shadow-inner">
               <Activity size={24} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg">Track <span className="text-primary">Progress</span></div>
              <div className="text-gray-500 text-sm">Monitor & improve daily</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center p-4 rounded-full bg-[#1e1b2f] border border-white/5 shadow-inner">
               <Target size={24} className="text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg">Stay <span className="text-primary">Motivated</span></div>
              <div className="text-gray-500 text-sm">Achieve your fitness goals</div>
            </div>
          </div>
        </div>

        {/* Pagination Dots Simulator for branding graphic */}
        <div className="flex gap-2 mt-16">
           <div className="w-2 h-2 rounded-full bg-primary" />
           <div className="w-2 h-2 rounded-full bg-gray-600" />
           <div className="w-2 h-2 rounded-full bg-gray-600" />
        </div>
      </div>

      {/* Right Pane Dynamic Form Panel */}
      <div className="w-[55%] h-full flex items-center justify-center p-8 z-10">
         <div className="w-full max-w-2xl max-h-[95vh] bg-[#1a1c29] border border-white/5 rounded-3xl p-8 flex flex-col relative overflow-hidden shadow-2xl">

            {/* Header / Progress bar */}
            <div className="shrink-0 flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-primary flex items-center justify-center font-bold bg-[#141622]">{step}</div>
                  <div className="text-gray-400">of 2</div>
               </div>

               {/* Progress Dashes */}
               <div className="flex-1 max-w-[200px] mx-8 flex gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-primary" />
                  <div className={clsx("flex-1 h-1.5 rounded-full", step >= 2 ? "bg-primary" : "bg-gray-800")} />
               </div>

               <div className="text-right">
                  <div className="font-semibold text-sm">Every step counts</div>
                  <div className="text-xs text-gray-500">Let's get you started!</div>
               </div>
            </div>

            <div className="shrink-0 mb-4">
               <h2 className="text-2xl font-bold">Complete Your Fitness Profile</h2>
               <p className="text-gray-400 text-sm">Help us personalize your fitness journey</p>
            </div>

            {error && <div className="shrink-0 mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>}

            {/* Content Switcher */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto py-2 pr-4 custom-scrollbar">
               {step === 1 && (
                  <>
                     <div>
                        <label className="block text-sm font-semibold mb-2">Date of Birth</label>
                        <input type="date" className="w-full bg-[#151722] border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-primary transition"
                               value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                     </div>

                     <div>
                        <label className="block text-sm font-semibold mb-2">Gender</label>
                        <div className="flex gap-4">
                           <button onClick={() => setFormData({...formData, gender: 'Male'})}
                                   className={clsx("flex-1 py-3 rounded-xl border transition flex items-center justify-center gap-2 font-medium",
                                   formData.gender === 'Male' ? "border-primary bg-primary/10 text-white" : "border-white/10 text-gray-400 hover:border-gray-500")}>
                                   ♂ Male
                           </button>
                           <button onClick={() => setFormData({...formData, gender: 'Female'})}
                                   className={clsx("flex-1 py-3 rounded-xl border transition flex items-center justify-center gap-2 font-medium",
                                   formData.gender === 'Female' ? "border-primary bg-primary/10 text-white" : "border-white/10 text-gray-400 hover:border-gray-500")}>
                                   ♀ Female
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-semibold mb-2">Height</label>
                           <div className="flex bg-[#151722] border border-white/10 rounded-xl items-center overflow-hidden focus-within:border-primary transition">
                              <div className="p-3 bg-white/5 border-r border-white/10 text-gray-400"><Activity size={18} /></div>
                              <input type="number" min="50" max="250" className="flex-1 bg-transparent px-3 py-2.5 outline-none" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
                              <div className="px-3 text-gray-500 select-none">cm</div>
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-semibold mb-2">Weight</label>
                           <div className="flex bg-[#151722] border border-white/10 rounded-xl items-center overflow-hidden focus-within:border-primary transition">
                              <div className="p-3 bg-white/5 border-r border-white/10 text-gray-400"><Target size={18} /></div>
                              <input type="number" min="20" max="300" className="flex-1 bg-transparent px-3 py-2.5 outline-none" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                              <div className="px-3 text-gray-500 select-none">kg</div>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-semibold mb-2">Do you have previous workout experience?</label>
                        <div className="flex gap-4">
                           <button onClick={() => setFormData({...formData, workout_experience: 'Yes'})}
                                   className={clsx("flex-1 py-2.5 rounded-xl border transition flex items-center justify-center gap-2",
                                   formData.workout_experience === 'Yes' ? "border-primary bg-primary/10 text-white" : "border-white/10 text-gray-400 hover:border-gray-500")}>
                                   ✓ Yes
                           </button>
                           <button onClick={() => setFormData({...formData, workout_experience: 'No'})}
                                   className={clsx("flex-1 py-2.5 rounded-xl border transition flex items-center justify-center gap-2",
                                   formData.workout_experience === 'No' ? "border-primary bg-primary/10 text-white" : "border-white/10 text-gray-400 hover:border-gray-500")}>
                                   ○ No
                           </button>
                        </div>
                     </div>
                  </>
               )}

               {step === 2 && (
                  <>
                     <div>
                        <label className="block text-sm font-semibold mb-2 text-primary">AI Target Formulation</label>
                        <p className="text-gray-400 text-sm mb-4">Let's refine your target goals to ensure the predictive AI model assigns you the optimal progression plan.</p>
                     </div>

                     <div>
                        <label className="block text-sm font-semibold mb-2">Preferred Session Duration</label>
                        <div className="flex bg-[#151722] border border-white/10 rounded-xl items-center overflow-hidden focus-within:border-primary transition">
                           <input type="number" min="10" max="180" className="flex-1 bg-transparent px-4 py-3 outline-none" value={formData.workout_duration} onChange={e => setFormData({...formData, workout_duration: e.target.value})} />
                           <div className="px-4 text-gray-500 select-none bg-white/5 py-3 border-l border-white/5">Minutes</div>
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-semibold mb-2 mt-2">Weekly Goal Frequency</label>
                        <div className="flex bg-[#151722] border border-white/10 rounded-xl items-center overflow-hidden focus-within:border-primary transition">
                           <input type="number" min="1" max="7" className="flex-1 bg-transparent px-4 py-3 outline-none" value={formData.weekly_frequency} onChange={e => setFormData({...formData, weekly_frequency: e.target.value})} />
                           <div className="px-4 text-gray-500 select-none bg-white/5 py-3 border-l border-white/5">Days / Week</div>
                        </div>
                     </div>
                  </>
               )}
            </div>

            {/* Bottom Actions */}
            <div className="shrink-0 flex gap-4 mt-6 pt-4 border-t border-white/5">
                <button
                   onClick={() => step > 1 ? setStep(step - 1) : navigate('/')}
                   className="w-[140px] px-6 py-3 rounded-xl flex items-center justify-center gap-2 bg-[#2a2c39] hover:bg-[#343644] text-white transition font-semibold"
                >
                   <ArrowLeft size={18} /> Back
                </button>
                <button
                   onClick={nextStep}
                   disabled={isSubmitting}
                   className="flex-1 px-6 py-3 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition font-semibold shadow-[0_0_15px_rgba(102,126,234,0.4)] disabled:opacity-50"
                >
                   {isSubmitting ? 'Processing AI...' : step === 1 ? 'Continue' : 'Generate Plan'} {step === 1 && !isSubmitting && <ArrowRight size={18} />}
                </button>
            </div>

         </div>
      </div>
    </div>
  );
}
