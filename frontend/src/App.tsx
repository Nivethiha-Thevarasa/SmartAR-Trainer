import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// @ts-ignore
import LoginScreen from './screens/LoginScreen';
// @ts-ignore
import WorkoutDashboard from './screens/WorkoutDashboard';
// @ts-ignore
import FitnessForm from './screens/FitnessForm';
// @ts-ignore
import WorkoutSession from './screens/WorkoutSession';
// @ts-ignore
import AnalyticsScreen from './screens/AnalyticsScreen';
// @ts-ignore
import WorkoutScreen from './screens/WorkoutScreen';
// @ts-ignore
import TutorialScreen from './screens/TutorialScreen';
import ProfileScreen from './screens/ProfileScreen';
import VerificationScreen from './screens/VerificationScreen';
import { useState, useEffect } from 'react';
import { API } from './api';

import CalendarScreen from './screens/CalendarScreen';

const ProtectedRoute = ({ user, children }: { user: any, children: React.ReactNode }) => {
  if (!user) return <Navigate to="/" />;
  if (user.status === 'INACTIVE' || user.email_verified === false) {
     return <Navigate to="/verify-email" />;
  }
  return <>{children}</>;
};

// Simple Context for Auth could be added, passing props for simplicity here
function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("smartar_token");
      if (token) {
        try {
          const me = await API.user.getMe();
          setUser(me);
        } catch (e) {
          console.error("Auto login failed", e);
          localStorage.removeItem("smartar_token");
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#0c0d14] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
           <div className="w-8 h-8 rounded-full border-4 border-gray-600 border-t-primary animate-spin"></div>
           <div>Loading SmartAR Trainer...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="w-screen h-screen bg-background overflow-hidden relative">
        <Routes>
          <Route path="/" element={user ? (user.status === 'INACTIVE' ? <Navigate to="/verify-email" /> : <Navigate to="/dashboard" />) : <LoginScreen onLogin={(data) => setUser(data)} />} />
          <Route path="/fitness-form" element={<FitnessForm onLogin={(data) => setUser(data)} />} />
          <Route path="/verify-email" element={<VerificationScreen user={user} onVerified={(data) => setUser(data)} />} />
          <Route path="/workouts" element={<ProtectedRoute user={user}><WorkoutScreen user={user} onLogout={() => setUser(null)} /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute user={user}><WorkoutDashboard user={user} onLogout={() => setUser(null)} /></ProtectedRoute>} />
          <Route path="/tutorial/:id" element={<ProtectedRoute user={user}><TutorialScreen user={user} /></ProtectedRoute>} />
          <Route path="/session/:id" element={<ProtectedRoute user={user}><WorkoutSession user={user} /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute user={user}><AnalyticsScreen user={user} /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute user={user}><CalendarScreen user={user} onLogout={() => setUser(null)} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProfileScreen user={user} onUpdateUser={(data: any) => setUser({...user, ...data})} onLogout={() => setUser(null)} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
