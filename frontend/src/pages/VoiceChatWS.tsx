import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAgent, isAuthenticated } from '../services/api';
import { WavRecorder } from '../utils/audioRecorder';
import { VoiceWebSocket } from '../utils/voiceWebSocket';
import ReactMarkdown from 'react-markdown';

interface Agent {
    id: string;
    name: string;
    system_prompt: string;
}

interface Message {
    type: 'user' | 'agent';
    text: string;
}

export default function VoiceChatWS() {
    const { agentId } = useParams();
    const navigate = useNavigate();

    const [agent, setAgent] = useState<Agent | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [wsConnected, setWsConnected] = useState(false);

    // Caption state
    const [currentCaption, setCurrentCaption] = useState('');
    const [highlightedWords, setHighlightedWords] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const wavRecorderRef = useRef<WavRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const captionRef = useRef<HTMLDivElement | null>(null);
    const wsRef = useRef<VoiceWebSocket | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        if (agentId) {
            fetchAgent();
            connectWebSocket();
        }

        return () => {
            // Cleanup WebSocket on unmount
            wsRef.current?.disconnect();
        };
    }, [agentId, navigate]);

    const fetchAgent = async () => {
        try {
            const res = await getAgent(agentId!);
            setAgent(res.data);
        } catch (err) {
            console.error('Failed to fetch agent:', err);
            navigate('/dashboard');
        }
    };

    const connectWebSocket = async () => {
        const token = localStorage.getItem('token');
        if (!token || !agentId) return;

        try {
            const ws = new VoiceWebSocket(agentId, token);
            wsRef.current = ws;

            // Set up event handlers
            ws.onConnected(() => {
                console.log('[UI] WebSocket connected');
                setWsConnected(true);
                setError('');
            });

            ws.onDisconnected(() => {
                console.log('[UI] WebSocket disconnected');
                setWsConnected(false);
            });

            ws.onTranscriptReceived((text) => {
                console.log('[UI] Transcript:', text);
                setMessages(prev => [...prev, { type: 'user', text }]);
            });

            ws.onResponseReceived((text) => {
                console.log('[UI] Response:', text);
                setMessages(prev => [...prev, { type: 'agent', text }]);
                setCurrentCaption(text);
            });

            ws.onAudioCompleteReceived((audioBlob) => {
                console.log('[UI] Audio complete:', audioBlob.size, 'bytes');
                const audioUrl = URL.createObjectURL(audioBlob);

                if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.play();
                    setIsPlaying(true);
                }
                setIsProcessing(false);
            });

            ws.onStatusUpdate((message) => {
                console.log('[UI] Status:', message);
                setStatusMessage(message);
            });

            ws.onErrorReceived((error) => {
                console.error('[UI] Error:', error);
                setError(error);
                setIsProcessing(false);
            });

            // Connect
            await ws.connect();
        } catch (err) {
            console.error('WebSocket connection failed:', err);
            setError('Failed to connect to voice server');
        }
    };

    const startRecording = async () => {
        try {
            stopPlayback();

            console.log('Starting WAV recording...');
            const recorder = new WavRecorder({ sampleRate: 16000 });
            wavRecorderRef.current = recorder;

            await recorder.start();
            setIsRecording(true);
            setError('');
        } catch (err) {
            console.error('Mic error:', err);
            setError('Could not access microphone. Please allow microphone access.');
        }
    };

    const stopRecording = async () => {
        if (wavRecorderRef.current && isRecording) {
            setIsRecording(false);

            setTimeout(async () => {
                if (wavRecorderRef.current) {
                    try {
                        const audioBlob = await wavRecorderRef.current.stop();
                        console.log(`Recording stopped. WAV size: ${audioBlob.size} bytes`);

                        if (audioBlob.size < 100) {
                            setError("Please hold the button longer to speak.");
                        } else {
                            await processAudio(audioBlob);
                        }
                    } catch (err) {
                        console.error("Error stopping recording:", err);
                    }
                }
            }, 500);
        }
    };

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        if (!wsRef.current || !wsRef.current.isConnected()) {
            setError('WebSocket not connected. Reconnecting...');
            await connectWebSocket();
            return;
        }

        setIsProcessing(true);
        setCurrentCaption('');
        setHighlightedWords(0);
        setStatusMessage('');

        try {
            await wsRef.current.sendAudio(audioBlob);
        } catch (err: any) {
            setError('Failed to send audio');
            setIsProcessing(false);
        }
    };

    // Word-by-word highlighting based on audio progress
    const handleTimeUpdate = () => {
        if (audioRef.current && currentCaption) {
            const audio = audioRef.current;
            const progress = audio.currentTime / audio.duration;
            const cleanText = currentCaption
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/##/g, '')
                .replace(/#/g, '')
                .replace(/`/g, '');
            const words = cleanText.split(/\s+/);
            const wordsToHighlight = Math.floor(progress * words.length);
            setHighlightedWords(wordsToHighlight);

            if (captionRef.current) {
                const scrollHeight = captionRef.current.scrollHeight;
                const clientHeight = captionRef.current.clientHeight;
                captionRef.current.scrollTop = (scrollHeight - clientHeight) * progress;
            }
        }
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        const cleanText = currentCaption
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .replace(/`/g, '');
        setHighlightedWords(cleanText.split(/\s+/).length);
    };

    // Render live caption with word highlighting
    const renderLiveCaption = () => {
        if (!currentCaption) return null;

        const cleanText = currentCaption
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/##/g, '')
            .replace(/#/g, '')
            .replace(/`/g, '');

        const words = cleanText.split(/\s+/);

        return words.map((word, index) => (
            <span
                key={index}
                className={`transition-colors duration-100 ${index < highlightedWords
                    ? 'text-blue-600 font-medium'
                    : 'text-slate-400'
                    }`}
            >
                {word}{' '}
            </span>
        ));
    };

    if (!agent) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading agent...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                className="hidden"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
            />

            {/* Navbar */}
            <header className="glass-panel border-b z-20 flex-shrink-0">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-slate-500 hover:text-slate-800 transition-colors">
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                                <span className="material-symbols-outlined text-xl">smart_toy</span>
                            </div>
                            <div>
                                <h1 className="font-bold text-lg text-slate-800">{agent.name}</h1>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full status-dot ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${wsConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {wsConnected ? 'Connected (WebSocket)' : 'Disconnected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 bg-white/50 hover:bg-white rounded-lg p-2 transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Agent Card with Live Caption */}
                    <div className="glass-card rounded-3xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-200/50">
                                <span className="material-symbols-outlined text-blue-600 text-2xl">smart_toy</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="font-bold text-slate-800">{agent.name}</h2>
                                <p className="text-xs text-slate-500">AI Voice Assistant (WebSocket)</p>
                            </div>

                            {isPlaying && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-end gap-0.5 h-5">
                                        <div className="w-1 bg-blue-500 rounded-full waveform-bar" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-1 bg-blue-500 rounded-full waveform-bar" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1 bg-blue-500 rounded-full waveform-bar" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1 bg-blue-500 rounded-full waveform-bar" style={{ animationDelay: '0.15s' }}></div>
                                    </div>
                                    <button
                                        onClick={stopPlayback}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                                    >
                                        <span className="material-symbols-outlined text-sm">stop</span>
                                        Stop
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Live Caption Area */}
                        <div
                            ref={captionRef}
                            className="bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl p-6 min-h-[180px] max-h-[350px] overflow-y-auto border border-white/60 shadow-inner"
                        >
                            {!currentCaption && !isProcessing && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">subtitles</span>
                                    <p className="text-slate-500 text-sm font-medium">Captions will appear here</p>
                                    <p className="text-slate-400 text-xs mt-1">Hold the mic button to start speaking</p>
                                </div>
                            )}

                            {isProcessing && (
                                <div className="flex flex-col items-center justify-center h-full py-8 gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-sm text-slate-500 font-medium">
                                            {statusMessage || 'Processing...'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {currentCaption && !isProcessing && (
                                <p className="text-lg leading-relaxed">
                                    {renderLiveCaption()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Conversation History */}
                    {messages.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conversation</h3>
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-2xl ${msg.type === 'user'
                                        ? 'bg-blue-50/50 border border-blue-100 ml-8'
                                        : 'glass-card mr-8'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-sm text-slate-500">
                                            {msg.type === 'user' ? 'person' : 'smart_toy'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 uppercase">
                                            {msg.type === 'user' ? 'You' : agent.name}
                                        </span>
                                    </div>
                                    {msg.type === 'user' ? (
                                        <p className="text-sm text-slate-700">{msg.text}</p>
                                    ) : (
                                        <div className="prose prose-sm max-w-none text-slate-700">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                                                    strong: ({ children }) => <strong className="text-blue-600 font-bold">{children}</strong>,
                                                    em: ({ children }) => <em className="italic">{children}</em>,
                                                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                                    li: ({ children }) => <li>{children}</li>,
                                                    code: ({ children }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Error Message */}
            {error && (
                <div className="px-6">
                    <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                        {error}
                    </div>
                </div>
            )}

            {/* Recording Controls */}
            <footer className="glass-panel border-t p-6">
                <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
                    <button
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                            ? 'bg-red-500 scale-110 shadow-red-500/30 animate-pulse'
                            : isProcessing || !wsConnected
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'btn-primary hover:scale-105'
                            }`}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        disabled={isProcessing || !wsConnected}
                    >
                        <span className="material-symbols-outlined text-white text-4xl">
                            {isRecording ? 'stop' : isProcessing ? 'hourglass_top' : 'mic'}
                        </span>
                    </button>
                    <p className="text-sm text-slate-500 font-medium">
                        {!wsConnected ? 'Connecting...' : isProcessing ? statusMessage || 'Processing...' : isRecording ? 'Release to send' : 'Hold to speak'}
                    </p>
                </div>
            </footer>
        </div>
    );
}
