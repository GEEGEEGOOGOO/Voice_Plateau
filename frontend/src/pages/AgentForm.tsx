import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createAgent, updateAgent, getAgent, getSkills, uploadSkill, isAuthenticated } from '../services/api';
import type { Skill } from '../services/api';
import Sidebar from '../components/Sidebar';

// Provider options
const STT_PROVIDERS = [
    { id: 'groq_whisper', name: 'Groq Whisper', description: 'Fast & accurate (Free)' },
    { id: 'deepgram', name: 'Deepgram', description: 'Real-time streaming' },
];

const LLM_PROVIDERS = [
    { id: 'groq', name: 'Groq Llama 3.3 70B', description: 'Ultra-fast inference (Free)', model: 'llama-3.3-70b-versatile' },
    { id: 'groq_instant', name: 'Groq Llama 3.1 8B Instant', description: 'Fastest response (Free)', model: 'llama-3.1-8b-instant' },
    { id: 'gemini', name: 'Google Gemini 1.5 Flash', description: 'Fast reasoning', model: 'gemini-1.5-flash' },
    { id: 'gemini_2', name: 'Google Gemini 2.0 Flash Exp', description: 'Latest experimental', model: 'gemini-2.0-flash-exp' },
];

const TTS_PROVIDERS = [
    { id: 'edge', name: 'Edge TTS', description: 'High quality (Free)' },
    { id: 'elevenlabs', name: 'ElevenLabs', description: 'Natural voices' },
];

// Edge TTS Voices (categorized by gender)
const EDGE_VOICES = {
    male: [
        { id: 'en-US-ChristopherNeural', name: 'Christopher (US Male)', lang: 'English (US)' },
        { id: 'en-US-GuyNeural', name: 'Guy (US Male)', lang: 'English (US)' },
        { id: 'en-US-EricNeural', name: 'Eric (US Male)', lang: 'English (US)' },
        { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)', lang: 'English (UK)' },
        { id: 'en-AU-WilliamNeural', name: 'William (AU Male)', lang: 'English (AU)' },
        { id: 'en-IN-PrabhatNeural', name: 'Prabhat (IN Male)', lang: 'English (IN)' },
    ],
    female: [
        { id: 'en-US-AriaNeural', name: 'Aria (US Female)', lang: 'English (US)' },
        { id: 'en-US-JennyNeural', name: 'Jenny (US Female)', lang: 'English (US)' },
        { id: 'en-US-MichelleNeural', name: 'Michelle (US Female)', lang: 'English (US)' },
        { id: 'en-GB-SoniaNeural', name: 'Sonia (UK Female)', lang: 'English (UK)' },
        { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)', lang: 'English (AU)' },
        { id: 'en-IN-NeerjaNeural', name: 'Neerja (IN Female)', lang: 'English (IN)' },
    ]
};

type RoleType = 'prompt' | 'skill';

export default function AgentForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(id);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Basic
    const [name, setName] = useState('');
    const [roleType, setRoleType] = useState<RoleType>('prompt');

    // Option A: Manual prompt
    const [systemPrompt, setSystemPrompt] = useState('');

    // Option B: Skill import
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
    const [uploadingSkill, setUploadingSkill] = useState(false);

    // Providers
    const [sttProvider, setSttProvider] = useState('groq_whisper');
    const [llmProvider, setLlmProvider] = useState('groq');
    const [ttsProvider, setTtsProvider] = useState('edge');
    const [voiceId, setVoiceId] = useState('en-US-ChristopherNeural');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        fetchSkills();
        if (isEditing) fetchAgent();
    }, [id, navigate]);

    const fetchSkills = async () => {
        try {
            const res = await getSkills();
            setAvailableSkills(res.data);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        }
    };

    const fetchAgent = async () => {
        try {
            const res = await getAgent(id!);
            setName(res.data.name);
            setSystemPrompt(res.data.system_prompt || '');
            setSttProvider(res.data.stt_provider || 'groq_whisper');
            setLlmProvider(res.data.llm_provider || 'groq');
            setTtsProvider(res.data.tts_provider || 'edge');
            setVoiceId(res.data.voice_id || 'en-US-ChristopherNeural');
            setSelectedSkills(res.data.skills || []);
            setRoleType(res.data.skills?.length > 0 ? 'skill' : 'prompt');
        } catch (err) {
            navigate('/dashboard');
        }
    };

    const toggleSkill = (skillId: string) => {
        setSelectedSkills(prev =>
            prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
        );
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingSkill(true);
        setError('');

        try {
            const result = await uploadSkill(file);
            await fetchSkills();
            setSelectedSkills(prev => [...prev, result.id]);
            alert(`Skill "${result.name}" uploaded successfully!`);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to upload skill file');
        } finally {
            setUploadingSkill(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validate based on role type
        if (roleType === 'prompt' && !systemPrompt.trim()) {
            setError('Please enter a system prompt');
            setLoading(false);
            return;
        }
        if (roleType === 'skill' && selectedSkills.length === 0) {
            setError('Please select at least one skill');
            setLoading(false);
            return;
        }

        const agentData = {
            name,
            system_prompt: roleType === 'prompt' ? systemPrompt : `Agent with skills: ${selectedSkills.join(', ')}`,
            stt_provider: sttProvider,
            llm_provider: llmProvider,
            tts_provider: ttsProvider,
            voice_id: voiceId,
            skills: roleType === 'skill' ? selectedSkills : [],
        };

        try {
            if (isEditing) {
                await updateAgent(id!, agentData);
            } else {
                await createAgent(agentData);
            }
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to save agent');
        } finally {
            setLoading(false);
        }
    };

    const playVoicePreview = async (voiceId: string) => {
        // Stop current audio if playing
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingVoice === voiceId) {
            setPlayingVoice(null);
            return;
        }

        try {
            setPlayingVoice(voiceId);
            const audio = new Audio(`http://localhost:8000/api/voice-preview/${voiceId}`);
            audioRef.current = audio;

            audio.onended = () => {
                setPlayingVoice(null);
                audioRef.current = null;
            };

            audio.onerror = () => {
                setPlayingVoice(null);
                audioRef.current = null;
                setError('Failed to play voice preview');
            };

            await audio.play();
        } catch (err) {
            setPlayingVoice(null);
            setError('Failed to play voice preview');
        }
    };

    return (
        <div className="h-screen flex overflow-hidden">
            <Sidebar />

            {/* Main */}
            <main className="flex-1 h-full overflow-y-auto p-8 pb-24">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">
                        {isEditing ? 'Edit Agent' : 'Create Agent'}
                    </h2>
                    <p className="text-slate-500 mb-8">Configure your voice agent's role and capabilities</p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Agent Name */}
                        <div className="glass-card rounded-2xl p-6">
                            <label className="text-slate-700 text-sm font-medium mb-2 block">Agent Name</label>
                            <input
                                className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white/50 focus:border-blue-500 outline-none text-slate-800"
                                placeholder="e.g., Math Tutor, Sales Coach"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        {/* Role Type Selection */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">
                                Agent Role Definition
                            </h3>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {/* Option A */}
                                <button
                                    type="button"
                                    onClick={() => setRoleType('prompt')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${roleType === 'prompt'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >

                                    <h4 className="font-semibold text-slate-800 mb-1">Prompt Engineering</h4>
                                    <p className="text-xs text-slate-500">Write your own system prompt. LLM uses its intelligence to take on the role.</p>
                                </button>

                                {/* Option B */}
                                <button
                                    type="button"
                                    onClick={() => setRoleType('skill')}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${roleType === 'skill'
                                        ? 'border-amber-500 bg-amber-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >

                                    <h4 className="font-semibold text-slate-800 mb-1">Import Skill File</h4>
                                    <p className="text-xs text-slate-500">Use .md skill file from library. LLM follows exact instructions.</p>
                                </button>
                            </div>

                            {/* Option A Content */}
                            {roleType === 'prompt' && (
                                <div className="border-t border-slate-200 pt-6">
                                    <label className="text-slate-700 text-sm font-medium mb-3 block">System Prompt</label>
                                    <textarea
                                        className="w-full min-h-[150px] p-4 rounded-xl border border-slate-200 bg-white/50 focus:border-blue-500 outline-none text-slate-800 resize-none"
                                        placeholder="You are a helpful assistant that..."
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                    />
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="text-xs text-slate-500">Templates:</span>
                                        <button type="button" onClick={() => setSystemPrompt("You are a friendly customer support agent. Help users with their questions politely and efficiently. Always be empathetic and solution-oriented.")} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 rounded-lg text-xs">🎧 Support</button>
                                        <button type="button" onClick={() => setSystemPrompt("You are a professional sales representative. Help customers understand products, address objections, and guide them to purchasing decisions.")} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 rounded-lg text-xs">💼 Sales</button>
                                        <button type="button" onClick={() => setSystemPrompt("You are a patient and knowledgeable tutor. Explain concepts clearly, use examples, and break down complex topics into simple steps.")} className="px-3 py-1 bg-slate-100 hover:bg-blue-50 rounded-lg text-xs">📚 Tutor</button>
                                    </div>
                                </div>
                            )}

                            {/* Option B Content */}
                            {roleType === 'skill' && (
                                <div className="border-t border-slate-200 pt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <label className="text-slate-700 text-sm font-medium">Skill Library</label>
                                            <p className="text-slate-500 text-xs">Select from library or upload new skill file</p>
                                        </div>
                                        <div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".md"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingSkill}
                                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-lg">upload_file</span>
                                                {uploadingSkill ? 'Uploading...' : 'Upload .md File'}
                                            </button>
                                        </div>
                                    </div>

                                    {availableSkills.length === 0 ? (
                                        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
                                            <p className="text-slate-500">No skills in library</p>
                                            <p className="text-slate-400 text-xs">Upload a .md skill file to get started</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {availableSkills.map((skill) => (
                                                <label
                                                    key={skill.id}
                                                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedSkills.includes(skill.id)
                                                        ? 'border-amber-500 bg-amber-50'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white/50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSkills.includes(skill.id)}
                                                        onChange={() => toggleSkill(skill.id)}
                                                        className="w-5 h-5 mt-0.5 text-amber-500 rounded"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-slate-800">{skill.name}</span>
                                                            {skill.is_system && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 rounded-full text-blue-600">SYSTEM</span>
                                                            )}
                                                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 uppercase">{skill.category}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1">{skill.description}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Provider Selection */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-500">settings</span>
                                Voice Pipeline
                            </h3>

                            <div className="grid grid-cols-3 gap-4">
                                {/* STT */}
                                <div>
                                    <label className="text-slate-700 text-sm font-medium mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-green-500 text-base">mic</span> STT
                                    </label>
                                    <div className="space-y-2">
                                        {STT_PROVIDERS.map((p) => (
                                            <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${sttProvider === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                                <input type="radio" name="stt" value={p.id} checked={sttProvider === p.id} onChange={(e) => setSttProvider(e.target.value)} className="w-3 h-3" />
                                                <div><div className="font-medium text-slate-800">{p.name}</div><div className="text-[10px] text-slate-500">{p.description}</div></div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* LLM */}
                                <div>
                                    <label className="text-slate-700 text-sm font-medium mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-blue-500 text-base">psychology</span> LLM
                                    </label>
                                    <div className="space-y-2">
                                        {LLM_PROVIDERS.map((p) => (
                                            <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${llmProvider === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                                <input type="radio" name="llm" value={p.id} checked={llmProvider === p.id} onChange={(e) => setLlmProvider(e.target.value)} className="w-3 h-3" />
                                                <div><div className="font-medium text-slate-800">{p.name}</div><div className="text-[10px] text-slate-500">{p.description}</div></div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* TTS */}
                                <div>
                                    <label className="text-slate-700 text-sm font-medium mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-orange-500 text-base">volume_up</span> TTS
                                    </label>
                                    <div className="space-y-2">
                                        {TTS_PROVIDERS.map((p) => (
                                            <label key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${ttsProvider === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                                                <input type="radio" name="tts" value={p.id} checked={ttsProvider === p.id} onChange={(e) => setTtsProvider(e.target.value)} className="w-3 h-3" />
                                                <div><div className="font-medium text-slate-800">{p.name}</div><div className="text-[10px] text-slate-500">{p.description}</div></div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voice Selection (Edge TTS only) */}
                        {ttsProvider === 'edge' && (
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-500">record_voice_over</span>
                                    Voice Selection
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* Male Voices */}
                                    <div>
                                        <label className="text-slate-700 text-sm font-medium mb-3 flex items-center gap-1">
                                            <span className="text-blue-600">👨</span> Male Voices
                                        </label>
                                        <div className="space-y-2">
                                            {EDGE_VOICES.male.map((voice) => (
                                                <label
                                                    key={voice.id}
                                                    className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-all ${voiceId === voice.id
                                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="voice"
                                                        value={voice.id}
                                                        checked={voiceId === voice.id}
                                                        onChange={(e) => setVoiceId(e.target.value)}
                                                        className="w-4 h-4 mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-slate-800">{voice.name}</div>
                                                        <div className="text-[10px] text-slate-500">{voice.lang}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            playVoicePreview(voice.id);
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${playingVoice === voice.id
                                                            ? 'bg-blue-500 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-blue-100'
                                                            }`}
                                                        title="Play sample"
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            {playingVoice === voice.id ? 'stop' : 'play_arrow'}
                                                        </span>
                                                    </button>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Female Voices */}
                                    <div>
                                        <label className="text-slate-700 text-sm font-medium mb-3 flex items-center gap-1">
                                            <span className="text-pink-600">👩</span> Female Voices
                                        </label>
                                        <div className="space-y-2">
                                            {EDGE_VOICES.female.map((voice) => (
                                                <label
                                                    key={voice.id}
                                                    className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-all ${voiceId === voice.id
                                                        ? 'border-pink-500 bg-pink-50 shadow-sm'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="voice"
                                                        value={voice.id}
                                                        checked={voiceId === voice.id}
                                                        onChange={(e) => setVoiceId(e.target.value)}
                                                        className="w-4 h-4 mt-0.5"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-slate-800">{voice.name}</div>
                                                        <div className="text-[10px] text-slate-500">{voice.lang}</div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            playVoicePreview(voice.id);
                                                        }}
                                                        className={`p-2 rounded-lg transition-all ${playingVoice === voice.id
                                                            ? 'bg-pink-500 text-white'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-pink-100'
                                                            }`}
                                                        title="Play sample"
                                                    >
                                                        <span className="material-symbols-outlined text-base">
                                                            {playingVoice === voice.id ? 'stop' : 'play_arrow'}
                                                        </span>
                                                    </button>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 mt-8">
                            <Link to="/dashboard" className="flex-1 h-12 glass-panel text-slate-600 rounded-xl font-medium flex items-center justify-center hover:bg-white border border-slate-200">Cancel</Link>
                            <button type="submit" disabled={loading} className="flex-1 h-12 btn-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/30">
                                {loading ? 'Saving...' : <><span>{isEditing ? 'Save' : 'Create Agent'}</span><span className="material-symbols-outlined">check</span></>}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
