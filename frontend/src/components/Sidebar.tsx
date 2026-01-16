import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../services/api';

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="glass-sidebar w-72 h-full flex flex-col justify-between py-6 px-4 z-20 relative">
            <div>
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-[24px]">mic</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-800">VoiceAI</h1>
                        <p className="text-xs text-slate-500 font-medium">Admin Workspace</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    <Link to="/dashboard" className="nav-item flex items-center gap-3 px-4 py-3">
                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                        <span className="text-sm">Dashboard</span>
                    </Link>
                    <Link to="/skills" className="nav-item flex items-center gap-3 px-4 py-3">
                        <span className="material-symbols-outlined text-[20px]">extension</span>
                        <span className="text-sm">Skills Library</span>
                    </Link>
                    <Link to="/settings" className="nav-item flex items-center gap-3 px-4 py-3">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span className="text-sm">Settings</span>
                    </Link>
                </nav>
            </div>

            {/* Bottom actions */}
            <div>
                <Link to="/agents/new" className="btn-primary w-full text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all mb-4">
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    New Agent
                </Link>
                <button
                    onClick={handleLogout}
                    className="nav-item w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-800"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}
