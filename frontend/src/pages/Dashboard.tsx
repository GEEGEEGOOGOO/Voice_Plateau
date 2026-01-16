import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAgents, deleteAgent, logout, isAuthenticated } from '../services/api';
import Sidebar from '../components/Sidebar';

interface Agent {
    id: string;
    name: string;
    system_prompt: string;
}

export default function Dashboard() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        fetchAgents();
    }, [navigate]);

    const fetchAgents = async () => {
        try {
            const res = await getAgents();
            setAgents(res.data);
        } catch (err) {
            console.error('Failed to fetch agents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this agent?')) {
            await deleteAgent(id);
            fetchAgents();
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative h-full">
                {/* Background blurs */}
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-purple-300/20 rounded-full blur-[80px]"></div>
                </div>

                <div className="relative z-10 p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Agent Dashboard</h2>
                            <p className="text-slate-500 mt-1">Welcome back. Manage your voice AI agents.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="search-glass rounded-xl px-4 py-2.5 flex items-center gap-2 w-64 transition-all">
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                                <input
                                    className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700 focus:ring-0 p-0"
                                    placeholder="Search agents..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center text-slate-600 hover:bg-white/60 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                            </button>
                            <button className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 border border-blue-200 flex items-center justify-center font-medium shadow-sm">
                                U
                            </button>
                        </div>
                    </header>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-slate-500 text-sm font-medium">Total Agents</span>
                                <span className="material-symbols-outlined text-blue-500 bg-blue-50 p-1.5 rounded-lg text-[20px]">group</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-slate-800">{agents.length}</span>
                                <span className="text-sm text-slate-400">configured</span>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-slate-500 text-sm font-medium">Active Sessions</span>
                                <span className="material-symbols-outlined text-purple-500 bg-purple-50 p-1.5 rounded-lg text-[20px]">graphic_eq</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-slate-800">0</span>
                                <span className="text-sm text-slate-400">right now</span>
                            </div>
                        </div>
                        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <span className="text-slate-500 text-sm font-medium">API Status</span>
                                <span className="material-symbols-outlined text-green-500 bg-green-50 p-1.5 rounded-lg text-[20px]">api</span>
                            </div>
                            <div className="flex items-center gap-2 mt-auto">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 status-dot"></span>
                                <span className="text-lg font-bold text-green-600">Online</span>
                            </div>
                        </div>
                    </div>

                    {/* Agents Section */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Your Voice Agents</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Agent Cards */}
                            {agents
                                .filter(agent =>
                                    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((agent) => (
                                    <div key={agent.id} className="glass-card rounded-3xl p-6 hover:shadow-xl transition-all duration-300 group">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-200/50 shadow-inner">
                                                    <span className="material-symbols-outlined text-blue-600 text-[28px]">smart_toy</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-800">{agent.name}</h4>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 status-dot"></span>
                                                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Ready</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white rounded-lg p-1 transition-colors">
                                                <span className="material-symbols-outlined">more_vert</span>
                                            </button>
                                        </div>

                                        {/* Waveform visualization */}
                                        <div className="h-24 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl mb-6 flex items-center justify-center border border-white/40 shadow-inner overflow-hidden relative group-hover:bg-white/40 transition-colors">
                                            <div className="flex gap-1 items-end h-8">
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0s' }}></div>
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0.1s' }}></div>
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0.2s' }}></div>
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0.3s' }}></div>
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0.4s' }}></div>
                                                <div className="w-1 bg-blue-400 rounded-full waveform-bar" style={{ animationDelay: '0.5s' }}></div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <Link
                                                to={`/voice/${agent.id}`}
                                                className="glass-panel hover:bg-white py-2.5 rounded-xl text-xs font-semibold text-blue-600 flex flex-col items-center gap-1 transition-all group-hover:shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">chat</span>
                                                Chat
                                            </Link>
                                            <Link
                                                to={`/agents/${agent.id}/edit`}
                                                className="glass-panel hover:bg-white py-2.5 rounded-xl text-xs font-semibold text-slate-600 flex flex-col items-center gap-1 transition-all group-hover:shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">edit</span>
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(agent.id)}
                                                className="glass-panel hover:bg-white hover:text-red-500 py-2.5 rounded-xl text-xs font-semibold text-slate-600 flex flex-col items-center gap-1 transition-all group-hover:shadow-md"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">delete</span>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}

                            {/* Create New Agent Card */}
                            <Link
                                to="/agents/new"
                                className="border-2 border-dashed border-slate-300/60 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all h-full min-h-[280px]"
                            >
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[32px]">add</span>
                                </div>
                                <span className="font-medium">Create New Agent</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
