import { Home, Dumbbell, BarChart3, Calendar, User, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Workout', icon: Dumbbell, path: '/workouts' },
    { name: 'Stats', icon: BarChart3, path: '/analytics' },
    { name: 'Calendar', icon: Calendar, path: '/calendar' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <div className="w-[280px] h-full flex flex-col justify-between pt-8 pb-6 px-4 shrink-0 bg-[#0c0d14] border-r border-white/5 relative">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-12 px-6">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-primary">SmartARTrainer</div>
        </div>

        <div className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition font-semibold
                  ${isActive ? 'bg-gradient-to-r from-[#211d37] to-[#3a2b5d] text-white shadow-lg'
                             : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon size={20} className={isActive ? 'text-primary' : ''} />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col px-4 pb-4 mt-auto">
  {/* Promotional Image + Logout Card */}
  <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 group">

    {/* Background Image */}
    <img
      src="/promo-bg.jpg"
      alt="Fitness motivation"
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />

    {/* Dark Overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />

    {/* Purple Glow */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />

    {/* Content */}
    <div className="relative z-10 h-full min-h-[280px] flex flex-col justify-between p-5">

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center gap-3 w-fit text-gray-200 font-semibold px-4 py-2.5 rounded-xl
                   hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm border border-transparent hover:border-white/10 group/logout shadow-lg"
      >
        <LogOut
          size={18}
          className="group-hover/logout:text-red-400 transition-colors"
        />
        <span>Logout</span>
      </button>

      {/* Motivation Text */}
      <div className="mt-auto">
        <h3 className="text-lg font-bold text-white leading-tight drop-shadow-lg">
          Stay Strong.
          <br />
          Stay Consistent.
          <br />
          See Results. <span>ðŸ’ª</span>
        </h3>
      </div>

    </div>
  </div>
</div>
    </div>
  );
}
