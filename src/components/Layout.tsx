import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import ClickSpark from './ClickSpark';
import { LogoutButton } from './common/Buttons';

const navItems = [
  { to: '/', label: '概览', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { to: '/apps', label: '应用', icon: <svg width="18" height="18" viewBox="0 0 85.6 96.6" fill="currentColor"><path d="M46.5,17.3l15.3,8.8c0.6,0.3,0.6,1.2,0,1.5L43.6,38.1c-0.6,0.3-1.2,0.3-1.7,0L23.8,27.6c-0.6-0.3-0.6-1.2,0-1.5L39,17.3V0L0,22.5v45.1v-0.2v0.2L15,59V41.3c0-0.6,0.7-1.1,1.3-0.7l18.2,10.5c0.6,0.3,0.9,0.9,0.9,1.5v21c0,0.6-0.7,1.1-1.3,0.7l-15.3-8.8l-15,8.6l39,22.5l39-22.5l-15-8.6l-15.3,8.8c-0.5,0.3-1.3-0.1-1.3-0.7v-21c0-0.6,0.3-1.2,0.9-1.5l18.2-10.5c0.5-0.3,1.3,0.1,1.3,0.7V59l15,8.6V22.5L46.5,0V17.3z"/></svg> },
  { to: '/logs', label: '日志', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { to: '/docs', label: '文档', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg> },
  { to: '/settings', label: '设置', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg> },
];

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <ClickSpark
      sparkColor="#f59e0b"
      sparkSize={12}
      sparkRadius={20}
      sparkCount={10}
      duration={400}
    >
      <div className="flex h-screen bg-beige-200 text-dark relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/50 via-beige-200 to-beige-200 z-0 overflow-hidden">
        <aside className="w-[20%] min-w-[220px] max-w-[280px] flex flex-col bg-white/60 backdrop-blur-2xl border-r border-[#E5E0D8]/60 shrink-0 z-10 shadow-glass">
          {/* Logo */}
          <div className="h-[64px] flex items-center px-6 border-b border-[#E5E0D8]/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <span className="text-[16px] font-display font-bold tracking-wider text-dark">UGuard</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 pt-5 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 border',
                    isActive
                      ? 'text-amber-700 bg-amber-50/80 border-amber-200/50 shadow-sm'
                      : 'text-dark/60 border-transparent hover:text-dark hover:bg-white/50'
                  )
                }
              >
                {item.icon}
                <span className="text-[14px]">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-6 pb-6">
            <LogoutButton onClick={() => { logout(); navigate('/login'); }} />
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8 w-full max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </ClickSpark>
  );
}
