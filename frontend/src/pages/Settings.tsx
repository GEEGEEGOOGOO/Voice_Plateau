import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../services/api';
import Sidebar from '../components/Sidebar';

export default function Settings() {
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
    }, [navigate]);

    return (
        <div className="h-screen flex overflow-hidden">
            <Sidebar />

            {/* Main */}
            <main className="flex-1 h-full overflow-y-auto p-8 pb-24">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">API Configuration</h2>
                    <p className="text-slate-500 mb-8">Configure your API keys in the backend .env file</p>

                    {/* Free Services */}
                    <div className="glass-card rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600">check_circle</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Free Services (Recommended)</h3>
                                <p className="text-xs text-slate-500">No charges, ready to use</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-purple-600 font-bold text-xs">GQ</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Groq (FREE)</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        <strong>STT:</strong> Whisper Large V3 (speech-to-text)<br />
                                        <strong>LLM:</strong> Llama 3.3 70B / Llama 3.1 8B Instant
                                    </p>
                                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                                        → Get free API key
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-blue-600 text-sm">volume_up</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Edge TTS (FREE)</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        <strong>TTS:</strong> Microsoft Edge voices (no API key needed!)
                                    </p>
                                    <p className="text-xs text-green-600 mt-2">✓ Always available, no configuration required</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Paid Services */}
                    <div className="glass-card rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-600">paid</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Paid Services (Optional)</h3>
                                <p className="text-xs text-slate-500">Add your own API keys to .env file</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-600 font-bold text-xs">GM</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Google Gemini</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        <strong>LLM:</strong> Gemini 1.5 Flash, Gemini 2.0 Flash
                                    </p>
                                    <p className="text-xs text-amber-600 mt-1">⚠️ May incur charges after free tier</p>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                                        → Get API key
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-green-600 font-bold text-xs">DG</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">Deepgram</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        <strong>STT:</strong> Real-time streaming speech-to-text
                                    </p>
                                    <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                                        → Get API key
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-orange-600 font-bold text-xs">11</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800">ElevenLabs</h4>
                                    <p className="text-xs text-slate-600 mt-1">
                                        <strong>TTS:</strong> Natural voice synthesis
                                    </p>
                                    <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">
                                        → Get API key
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How to Configure */}
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-indigo-600">terminal</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">How to Configure</h3>
                                <p className="text-xs text-slate-500">Edit the backend .env file</p>
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                            <div className="text-slate-400"># backend/.env</div>
                            <div className="mt-2">
                                <span className="text-green-400"># Free (Required)</span>
                            </div>
                            <div>
                                <span className="text-blue-300">GROQ_API_KEY</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-300">gsk_your_key_here</span>
                            </div>
                            <div className="mt-3">
                                <span className="text-amber-400"># Paid (Optional)</span>
                            </div>
                            <div>
                                <span className="text-blue-300">GEMINI_API_KEY</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-300">AIza...</span>
                            </div>
                            <div>
                                <span className="text-blue-300">DEEPGRAM_API_KEY</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-300">your_key</span>
                            </div>
                            <div>
                                <span className="text-blue-300">ELEVENLABS_API_KEY</span>
                                <span className="text-slate-400">=</span>
                                <span className="text-amber-300">sk_...</span>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500 mt-4">
                            After editing .env, restart the backend server for changes to take effect.
                        </p>
                    </div>

                    {/* Back Button */}
                    <div className="flex gap-4 mt-8">
                        <Link to="/dashboard" className="flex-1 h-12 btn-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span>Back to Dashboard</span>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
