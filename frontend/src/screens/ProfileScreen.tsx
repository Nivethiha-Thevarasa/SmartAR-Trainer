import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { API } from '../api';
import { Bell, Flame, Star, Dumbbell, Calendar, User, Edit3, Mail, Activity, MoveVertical, Scale, Clock, Award, Target, Info, X, Upload } from 'lucide-react';

export default function ProfileScreen({ user, onUpdateUser, onLogout }: { user: any, onUpdateUser?: (d: any) => void, onLogout: () => void }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.trainee_id) {
       API.user.getProfile(user.trainee_id).then(data => {
           setProfile(data);
           setEditForm({
               name: data.name,
               height: data.height,
               weight: data.weight,
               fitness_level: data.fitness_level,
               profile_image: data.profile_image
           });
       }).catch(e => console.error(e));
       API.analytics.getAnalytics(user.trainee_id).then(data => setStats(data)).catch(e => console.error(e));
    }
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  const p = profile || user;

  const totalWorkouts = stats?.total_sessions || 0;
  const streak = totalWorkouts > 0 ? Math.min(totalWorkouts, 7) : 0;
  const calories = totalWorkouts * 163;
  const consistency = totalWorkouts > 0 ? 90 : 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditForm((prev: any) => ({ ...prev, profile_image: reader.result }));
          };
          reader.readAsDataURL(file);
      }
  };

  const saveProfile = async () => {
      setSaving(true);
      try {
          const response = await fetch(`http://localhost:8000/api/user/${user.trainee_id}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('smartar_token')}`
              },
              body: JSON.stringify(editForm)
          });
          if (response.ok) {
              const updatedData = await API.user.getProfile(user.trainee_id);
              setProfile(updatedData);
              if (onUpdateUser) onUpdateUser(updatedData);
              setIsEditing(false);
          } else {
              alert("Failed to update profile.");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="w-full h-full flex bg-[#0c0d14] text-white selection:bg-primary/30 font-sans overflow-hidden">
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col p-10 overflow-y-auto relative">

        {/* Header Block */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-gray-400 text-sm">Manage your personal info and fitness profile</p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-[#161925] rounded-full p-1 border border-white/5">
                <button onClick={() => navigate('/dashboard')} className="px-6 py-2 text-sm text-gray-400 hover:text-white transition rounded-full">Dashboard</button>
                <button onClick={() => navigate('/workouts')} className="px-6 py-2 text-sm text-gray-400 hover:text-white transition rounded-full">Workout</button>
                <button className="px-6 py-2 text-sm bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white rounded-full shadow-lg">Profile</button>
              </div>
            </div>

            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 bg-[#667eea] hover:bg-[#764ba2] transition px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20">
              Edit Profile <Edit3 size={16} />
            </button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-[300px_1fr] gap-6">

           {/* LEFT COLUMN: User Card */}
           <div className="bg-[#161925] rounded-3xl p-6 border border-white/5 flex flex-col items-center">

              {/* Avatar Box */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 to-primary flex items-center justify-center text-4xl font-bold relative mb-4 shadow-[0_0_20px_rgba(102,126,234,0.4)] overflow-hidden">
                 {p.profile_image ? (
                     <img src={p.profile_image} alt="Profile" className="w-full h-full object-cover" />
                 ) : (
                     <>{p.name ? p.name[0].toUpperCase() : 'U'}</>
                 )}
                 <div className="absolute bottom-0 right-0 bg-[#1e2231] p-1.5 rounded-full border-2 border-[#161925] cursor-pointer">
                    <Star size={12} className="text-gray-400" />
                 </div>
              </div>

              <h2 className="text-xl font-bold mb-2">{p.name || "User"}</h2>
              <div className="bg-gradient-to-r from-[#2a1b41] to-[#1d1b38] border border-primary/20 text-primary px-4 py-1 rounded-full text-xs font-semibold mb-4">
                 {p.fitness_level || 'Beginner'}
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-8">
                 <Mail size={14} /> {p.email || 'user@example.com'}
              </div>

              {/* List Metrics */}
              <div className="w-full flex flex-col gap-4 mb-8">
                 <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3 text-gray-400"><Calendar size={16} /> Date of Birth</div>
                    <div className="font-semibold">{p.dob || '2001-01-01'}</div>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3 text-gray-400"><User size={16} /> Gender</div>
                    <div className="font-semibold capitalize">{p.gender || 'Unknown'}</div>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3 text-gray-400"><MoveVertical size={16} /> Height</div>
                    <div className="font-semibold">{p.height || 169} cm</div>
                 </div>
                 <div className="flex justify-between items-center text-sm pb-3">
                    <div className="flex items-center gap-3 text-gray-400"><Scale size={16} /> Weight</div>
                    <div className="font-semibold">{p.weight || 74} kg</div>
                 </div>
              </div>

              {/* Quote Block */}
              <div className="w-full bg-[#1e2231] rounded-2xl p-5 border border-white/5 mt-auto relative overflow-hidden">
                 <div className="absolute top-2 left-4 text-4xl text-primary/20 font-serif">"</div>
                 <div className="relative z-10 text-sm font-medium mt-4">
                    Discipline today,<br/>strength tomorrow. 💪
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: Fitness Overview */}
           <div className="flex flex-col gap-6">

              <div className="flex items-center gap-2 text-white font-semibold text-lg">
                 <Activity size={20} className="text-secondary" /> Fitness Profile
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-2 gap-6">
                  {/* Height */}
                  <div className="bg-[#161925] p-6 rounded-3xl border border-white/5 flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#2a1f4c] flex items-center justify-center border border-primary/20">
                           <MoveVertical size={20} className="text-[#9876e2]" />
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Height</div>
                           <div className="text-2xl font-bold">{p.height || 169.0} <span className="text-sm text-gray-500 font-normal">cm</span></div>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-[#2a1f4c] rounded-full mt-2" />
                     <div className="text-xs text-gray-500 mt-2">Your Height</div>
                  </div>

                  {/* Weight */}
                  <div className="bg-[#161925] p-6 rounded-3xl border border-white/5 flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#1b254a] flex items-center justify-center border border-blue-500/20">
                           <Scale size={20} className="text-[#6492f4]" />
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Weight</div>
                           <div className="text-2xl font-bold">{p.weight || 74.0} <span className="text-sm text-gray-500 font-normal">kg</span></div>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-[#1b254a] rounded-full mt-2" />
                     <div className="text-xs text-gray-500 mt-2">Your Weight</div>
                  </div>

                  {/* Duration */}
                  <div className="bg-[#161925] p-6 rounded-3xl border border-white/5 flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#2a1f4c] flex items-center justify-center border border-primary/20">
                           <Clock size={20} className="text-[#9876e2]" />
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Workout Duration</div>
                           <div className="text-2xl font-bold">{p.workout_duration || 15.0} <span className="text-sm text-gray-500 font-normal">min</span></div>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-[#2a1f4c] rounded-full mt-2" />
                     <div className="text-xs text-gray-500 mt-2">Average Duration</div>
                  </div>

                  {/* Frequency */}
                  <div className="bg-[#161925] p-6 rounded-3xl border border-white/5 flex flex-col">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#2c1d3b] flex items-center justify-center border border-pink-500/20">
                           <Calendar size={20} className="text-[#de739b]" />
                        </div>
                        <div>
                           <div className="text-gray-400 text-sm">Weekly Frequency</div>
                           <div className="text-2xl font-bold">{p.weekly_frequency || 4} <span className="text-sm text-gray-500 font-normal">days</span></div>
                        </div>
                     </div>
                     <div className="w-full h-1 bg-[#2c1d3b] rounded-full mt-2" />
                     <div className="text-xs text-gray-500 mt-2">Per Week</div>
                  </div>
              </div>

              {/* Current Plan Wide Banner */}
              <div className="bg-gradient-to-r from-[#19192c] to-[#25203d] rounded-3xl p-6 border border-white/5 flex justify-between items-center relative overflow-hidden">
                 <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7755e0] to-[#51369c] flex items-center justify-center">
                       <Star size={24} className="text-white fill-white" />
                    </div>
                    <div>
                       <div className="text-gray-400 text-sm">Current Plan</div>
                       <div className="text-xl font-bold text-white mb-1">{p.fitness_level || 'Beginner'}</div>
                       <div className="text-xs text-gray-400">Keep going! You're doing great.</div>
                    </div>
                 </div>
                 <div className="relative z-10 text-primary opacity-50 pr-8">
                     <Activity size={50} />
                 </div>
                 <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
              </div>

              {/* Bottom 2 Cards Grid */}
              <div className="grid grid-cols-[3fr_2fr] gap-6">

                 {/* Achievements */}
                 <div className="bg-[#161925] p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 font-semibold mb-6">
                       <Award size={18} className="text-yellow-500" /> Achievements
                    </div>
                    <div className="flex justify-between items-center px-4">
                       <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 bg-[#231b1d] rounded-2xl border border-red-500/20 flex items-center justify-center">
                             <Flame size={24} className="text-orange-500 fill-orange-500" />
                          </div>
                          <div className="text-center">
                             <div className="font-bold text-lg">{streak}</div>
                             <div className="text-xs text-gray-500">Day Streak</div>
                          </div>
                       </div>

                       <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 bg-[#23201d] rounded-2xl border border-yellow-500/20 flex items-center justify-center">
                             <Star size={24} className="text-yellow-400 fill-yellow-400" />
                          </div>
                          <div className="text-center">
                             <div className="font-bold text-lg">{totalWorkouts}</div>
                             <div className="text-xs text-gray-500">Workouts</div>
                          </div>
                       </div>

                       <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 bg-[#231d25] rounded-2xl border border-pink-500/20 flex items-center justify-center">
                             <Award size={24} className="text-[#de739b]" />
                          </div>
                          <div className="text-center">
                             <div className="font-bold text-lg">2</div>
                             <div className="text-xs text-gray-500">Badges</div>
                          </div>
                       </div>

                       <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 bg-[#1b2320] rounded-2xl border border-green-500/20 flex items-center justify-center">
                             <Target size={24} className="text-green-500" />
                          </div>
                          <div className="text-center">
                             <div className="font-bold text-lg">{consistency}%</div>
                             <div className="text-xs text-gray-500">Consistency</div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Quick Info */}
                 <div className="bg-[#161925] p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-2 font-semibold mb-5">
                       <Info size={18} className="text-blue-400" /> Quick Info
                    </div>
                    <div className="flex flex-col gap-4 text-sm">
                       <div className="flex justify-between items-center text-gray-400">
                          <div className="flex items-center gap-2"><Calendar size={14} /> Member Since</div>
                          <div className="text-white font-medium pl-6 text-right">May 2025</div>
                       </div>
                       <div className="flex justify-between items-center text-gray-400">
                          <div className="flex items-center gap-2"><Dumbbell size={14} /> Total Workouts</div>
                          <div className="text-white font-medium pl-6 text-right">{totalWorkouts}</div>
                       </div>
                       <div className="flex justify-between items-center text-gray-400">
                          <div className="flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Calorie Burn</div>
                          <div className="text-white font-medium pl-6 text-right">{calories.toLocaleString()} kcal</div>
                       </div>
                       <div className="flex justify-between items-center text-gray-400">
                          <div className="flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Longest Streak</div>
                          <div className="text-white font-medium pl-6 text-right">{streak} days</div>
                       </div>
                    </div>
                 </div>

              </div>
           </div>

        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-[#161925] rounded-3xl border border-white/10 p-8 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setIsEditing(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white">
                 <X size={24} />
              </button>

              <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

              <div className="flex flex-col gap-6">
                 {/* Image Uploader */}
                 <div className="flex flex-col items-center gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition overflow-hidden relative group"
                    >
                       {editForm.profile_image ? (
                           <img src={editForm.profile_image} alt="Preview" className="w-full h-full object-cover" />
                       ) : (
                           <Upload size={24} className="text-primary" />
                       )}
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Edit3 size={18} className="text-white" />
                       </div>
                    </div>
                    <div className="text-xs text-gray-400">Click to upload photo</div>
                    <input type="file" hidden accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name || ""}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                      className="bg-[#0c0d14] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Weight (kg)</label>
                        <input
                          type="number"
                          value={editForm.weight || 0}
                          onChange={e => setEditForm({...editForm, weight: parseFloat(e.target.value)})}
                          className="bg-[#0c0d14] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary"
                        />
                     </div>
                     <div className="flex flex-col gap-1">
                        <label className="text-sm text-gray-400">Height (cm)</label>
                        <input
                          type="number"
                          value={editForm.height || 0}
                          onChange={e => setEditForm({...editForm, height: parseFloat(e.target.value)})}
                          className="bg-[#0c0d14] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary"
                        />
                     </div>
                 </div>

                 <div className="flex flex-col gap-1">
                    <label className="text-sm text-gray-400">Fitness Target</label>
                    <select
                      value={editForm.fitness_level || "Beginner"}
                      onChange={e => setEditForm({...editForm, fitness_level: e.target.value})}
                      className="bg-[#0c0d14] border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none focus:border-primary"
                    >
                        <option value="Beginner">Beginner (15m)</option>
                        <option value="Intermediate">Intermediate (30m)</option>
                        <option value="Advanced">Advanced (45m)</option>
                    </select>
                 </div>

                 <button
                   onClick={saveProfile}
                   disabled={saving}
                   className="w-full mt-4 bg-primary hover:bg-secondary text-white font-bold py-3.5 rounded-xl shadow-lg transition"
                 >
                    {saving ? 'Saving...' : 'Save Changes'}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
