import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await login(email, password);
            localStorage.setItem('token', res.data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
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
                    <div className="flex items-center gap-6">
                        <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Help</a>
                        <a className="text-sm font-medium text-slate-600 hover:text-primary transition-colors" href="#">Documentation</a>
                    </div>
                </header>

                {/* Main Login Section */}
                <main className="flex-1 flex items-center justify-center p-4 min-h-0">
                    <div className="w-full max-w-[460px] mx-auto">
                        <div className="glass-card rounded-xl p-8 md:p-10 shadow-xl">
                            <div className="mb-8 text-center">
                                <h1 className="text-[#0d131c] text-3xl font-bold tracking-tight mb-2">Welcome Back</h1>
                                <p className="text-[#4b6c9b] text-sm">Manage your AI agents and voice pipelines</p>
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
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[#0d131c] text-sm font-medium">Password</label>
                                        <a className="text-primary text-xs font-semibold hover:underline" href="#">Forgot?</a>
                                    </div>
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
                                                className="text-slate-400 hover:text-slate-600 flex items-center bg-transparent border-none p-1 rounded"
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

                                {/* Remember Me */}
                                <div className="flex items-center gap-2 px-1">
                                    <input className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer" type="checkbox" />
                                    <span className="text-sm text-[#4b6c9b]">Keep me logged in</span>
                                </div>

                                {/* Login Button */}
                                <button
                                    className="w-full h-12 bg-gradient-to-r from-primary to-[#4a94ff] hover:shadow-lg hover:shadow-primary/30 text-white rounded-xl font-bold text-sm tracking-wide transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
                                    type="submit"
                                    disabled={loading}
                                >
                                    <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                                    {!loading && <span className="material-symbols-outlined text-lg">arrow_forward</span>}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#cfd9e8]/50"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white/10 px-2 text-[#4b6c9b] backdrop-blur-sm">Or continue with</span>
                                </div>
                            </div>

                            {/* Social Logins */}
                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex items-center justify-center gap-2 h-11 border border-[#cfd9e8] bg-white/40 hover:bg-white/60 rounded-xl transition-all">
                                    <svg className="size-5" fill="none" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                    </svg>
                                    <span className="text-sm font-medium text-[#0d131c]">Google</span>
                                </button>
                                <button className="flex items-center justify-center gap-2 h-11 border border-[#cfd9e8] bg-white/40 hover:bg-white/60 rounded-xl transition-all">
                                    <span className="material-symbols-outlined text-xl text-[#0d131c]">code</span>
                                    <span className="text-sm font-medium text-[#0d131c]">GitHub</span>
                                </button>
                            </div>

                            {/* Footer Message */}
                            <div className="mt-8 text-center">
                                <p className="text-sm text-[#4b6c9b]">
                                    New to VoiceAgent?
                                    <Link className="text-primary font-semibold hover:underline ml-1" to="/signup">Create an account</Link>
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
