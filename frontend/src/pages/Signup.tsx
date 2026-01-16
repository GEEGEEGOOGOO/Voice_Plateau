import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../services/api';

export default function Signup() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await signup(email, password);
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Abstract Background */}
            <div className="absolute inset-0 z-0 bg-wave-pattern overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
                <svg className="absolute bottom-0 w-full h-64 opacity-20" preserveAspectRatio="none" viewBox="0 0 1440 320">
                    <path d="M0,192L48,176C96,160,192,128,288,138.7C384,149,480,203,576,213.3C672,224,768,192,864,160C960,128,1056,96,1152,96C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="#1973f0" fillOpacity="1"></path>
                </svg>
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* NavBar */}
                <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
                    <div className="flex items-center gap-2 text-primary">
                        <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl">settings_voice</span>
                        </div>
                        <h2 className="text-[#0d131c] text-xl font-bold leading-tight tracking-tight">VoiceAgent AI</h2>
                    </div>
                </header>

                {/* Main Signup Section */}
                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-[460px]">
                        <div className="glass-card rounded-xl p-8 md:p-10">
                            <div className="mb-8 text-center">
                                <h1 className="text-[#0d131c] text-3xl font-bold tracking-tight mb-2">Create Account</h1>
                                <p className="text-[#4b6c9b] text-sm">Start building your voice AI agents today</p>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleSubmit}>
                                {/* Email Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[#0d131c] text-sm font-medium px-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 text-xl group-focus-within:text-primary transition-colors">mail</span>
                                        </div>
                                        <input
                                            className="flex w-full min-w-0 resize-none overflow-hidden rounded-xl text-[#0d131c] focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#cfd9e8] bg-white/50 focus:border-primary h-12 pl-11 pr-4 placeholder:text-[#94a3b8] text-sm font-normal transition-all"
                                            placeholder="name@company.com"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[#0d131c] text-sm font-medium px-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 text-xl group-focus-within:text-primary transition-colors">lock</span>
                                        </div>
                                        <input
                                            className="flex w-full min-w-0 resize-none overflow-hidden rounded-xl text-[#0d131c] focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#cfd9e8] bg-white/50 focus:border-primary h-12 pl-11 pr-11 placeholder:text-[#94a3b8] text-sm font-normal transition-all"
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
                                            <button
                                                className="text-slate-400 hover:text-slate-600 flex items-center"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <span className="material-symbols-outlined text-xl">
                                                    {showPassword ? 'visibility_off' : 'visibility'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Confirm Password Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[#0d131c] text-sm font-medium px-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-slate-400 text-xl group-focus-within:text-primary transition-colors">lock</span>
                                        </div>
                                        <input
                                            className="flex w-full min-w-0 resize-none overflow-hidden rounded-xl text-[#0d131c] focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-[#cfd9e8] bg-white/50 focus:border-primary h-12 pl-11 pr-4 placeholder:text-[#94a3b8] text-sm font-normal transition-all"
                                            placeholder="••••••••"
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Create Account Button */}
                                <button
                                    className="w-full h-12 bg-gradient-to-r from-primary to-[#4a94ff] hover:shadow-lg hover:shadow-primary/30 text-white rounded-xl font-bold text-sm tracking-wide transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                                    type="submit"
                                    disabled={loading}
                                >
                                    <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                                    {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                                </button>
                            </form>

                            {/* Footer Message */}
                            <div className="mt-8 text-center">
                                <p className="text-sm text-[#4b6c9b]">
                                    Already have an account?
                                    <Link className="text-primary font-semibold hover:underline ml-1" to="/login">Sign in</Link>
                                </p>
                            </div>
                        </div>

                        {/* Bottom Meta Links */}
                        <div className="mt-8 flex justify-center gap-6">
                            <a className="text-xs text-[#4b6c9b] hover:text-primary transition-colors" href="#">Privacy Policy</a>
                            <a className="text-xs text-[#4b6c9b] hover:text-primary transition-colors" href="#">Terms of Service</a>
                        </div>
                    </div>
                </main>

                {/* Wave Footer */}
                <div className="py-10 flex flex-col items-center gap-3">
                    <div className="flex items-end gap-1 h-8">
                        <div className="w-1.5 h-4 bg-primary/20 rounded-full"></div>
                        <div className="w-1.5 h-6 bg-primary/40 rounded-full"></div>
                        <div className="w-1.5 h-3 bg-primary/30 rounded-full"></div>
                        <div className="w-1.5 h-8 bg-primary rounded-full"></div>
                        <div className="w-1.5 h-5 bg-primary/50 rounded-full"></div>
                        <div className="w-1.5 h-7 bg-primary/70 rounded-full"></div>
                        <div className="w-1.5 h-4 bg-primary/30 rounded-full"></div>
                        <div className="w-1.5 h-6 bg-primary/40 rounded-full"></div>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#4b6c9b] font-semibold opacity-50">Powered by Neural Voice Engine v2.4</p>
                </div>
            </div>
        </div>
    );
}
