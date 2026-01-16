import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAgent, voiceChat, speakText, isAuthenticated } from '../services/api';
import { WavRecorder } from '../utils/audioRecorder';
import ReactMarkdown from 'react-markdown';

interface Agent {
    id: string;
    name: string;
    system_prompt: string;
}

// Grouped conversation turn
interface ConversationTurn {
    userText: string;
    agentText: string;
    timestamp: Date;
}

export default function VoiceChat() {
    const { agentId } = useParams();
    const navigate = useNavigate();

    const [agent, setAgent] = useState<Agent | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    // State now stores turns (pairs) instead of individual messages
    const [messages, setMessages] = useState<ConversationTurn[]>([]);
    const [error, setError] = useState('');

    // Caption state
    const [currentCaption, setCurrentCaption] = useState('');
    const [highlightedWords, setHighlightedWords] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Replay state (index refers to the Turn index now)
    const [replayingIndex, setReplayingIndex] = useState<number | null>(null);

    const wavRecorderRef = useRef<WavRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const captionRef = useRef<HTMLDivElement | null>(null);
    const chatHistoryRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        if (agentId) {
            fetchAgent();
        }
    }, [agentId, navigate]);

    // Auto-scroll chat history
    useEffect(() => {
        if (chatHistoryRef.current) {
            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchAgent = async () => {
        try {
            const res = await getAgent(agentId!);
            setAgent(res.data);
        } catch (err) {
            console.error('Failed to fetch agent:', err);
            navigate('/dashboard');
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
            setReplayingIndex(null);
        }
    };

    const playMessage = async (text: string, index: number) => {
        if (replayingIndex === index) {
            stopPlayback();
            return;
        }

        stopPlayback();
        setReplayingIndex(index);

        try {
            const audioBlob = await speakText(agentId!, text);
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.src = audioUrl;
                audioRef.current.onended = () => {
                    setReplayingIndex(null);
                    setIsPlaying(false);
                }
                audioRef.current.play();
                setIsPlaying(true);
            }
        } catch (err) {
            console.error("Failed to replay message:", err);
            setReplayingIndex(null);
            setError("Failed to generate audio for this message");
        }
    };

    const deleteTurn = (index: number) => {
        setMessages(prev => prev.filter((_, i) => i !== index));
        if (replayingIndex === index) {
            stopPlayback();
        }
    };

    const stopThinking = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsProcessing(false);
        setError('');
    };

    const processAudio = async (audioBlob: Blob) => {
        // Create new AbortController for this request
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setIsProcessing(true);
        setCurrentCaption('');
        setHighlightedWords(0);

        try {
            const data = await voiceChat(agentId!, audioBlob, controller.signal);

            const userText = data.user_text || '';
            const llmResponse = data.agent_response || '';

            // Add grouped turn
            if (userText || llmResponse) {
                setMessages(prev => [...prev, {
                    userText: userText,
                    agentText: llmResponse,
                    timestamp: new Date()
                }]);
            }

            // Set caption for live highlighting
            setCurrentCaption(llmResponse);

            if (data.audio_base64) {
                const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
                const blob = new Blob([audioBytes], { type: data.audio_type || 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(blob);

                if (audioRef.current) {
                    audioRef.current.src = audioUrl;

                    // Reset onended handler for main conversation flow
                    audioRef.current.onended = handleAudioEnded;

                    audioRef.current.play();
                    setIsPlaying(true);
                }
            }
        } catch (err: any) {
            // Ignore abort errors (user cancelled)
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                console.log('[VOICE] Request cancelled by user');
                return;
            }
            setError(err.response?.data?.detail || 'Failed to process audio');
        } finally {
            setIsProcessing(false);
            abortControllerRef.current = null;
        }
    };

    // Word-by-word highlighting based on audio progress
    const handleTimeUpdate = () => {
        // Only do highlighting for current conversation, not replays
        if (replayingIndex === null && audioRef.current && currentCaption) {
            const audio = audioRef.current;
            const progress = audio.currentTime / audio.duration;
            const words = currentCaption.split(/\s+/);
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
        if (replayingIndex === null) {
            setHighlightedWords(currentCaption.split(/\s+/).length);
        }
        setReplayingIndex(null);
    };

    // Render live caption with word highlighting (plain text, no markdown delay)
    const renderLiveCaption = () => {
        if (!currentCaption) return null;

        // Strip markdown symbols for clean display during live playback
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
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                className="hidden"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
            />

            {/* Navbar */}
            <header className="glass-panel border-b z-20 flex-shrink-0 bg-white shadow-sm">
                <div className="w-full px-6 py-3 flex items-center justify-between">
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
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot animate-pulse"></span>
                                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Live</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Areas - Flex Row */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Sidebar History (1/4 width) */}
                <aside className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-500">history</span>
                            History
                        </h2>
                        {messages.length > 0 && (
                            <button
                                onClick={() => setMessages([])}
                                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    <div ref={chatHistoryRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30 scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                                <p className="text-sm">No history yet</p>
                            </div>
                        ) : (
                            messages.map((turn, index) => (
                                <div key={index} className="relative group bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Delete Button (visible on hover) - Deletes entire turn */}
                                    <button
                                        onClick={() => deleteTurn(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 shadow-sm z-10"
                                        title="Delete exchange"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>

                                    {/* User Message */}
                                    {turn.userText && (
                                        <div className="flex justify-end mb-2">
                                            <div className="bg-blue-600 text-white px-3 py-2 rounded-2xl rounded-tr-none text-sm shadow-sm max-w-[90%]">
                                                <p>{turn.userText}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Agent Message */}
                                    {turn.agentText && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 text-slate-700 px-3 py-2 rounded-2xl rounded-tl-none text-sm max-w-[90%] w-full">
                                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                                                    <ReactMarkdown components={{
                                                        p: ({ children }) => <p className="mb-0">{children}</p>,
                                                        code: ({ children }) => <code className="bg-white px-1 rounded text-xs border border-slate-200">{children}</code>
                                                    }}>
                                                        {turn.agentText}
                                                    </ReactMarkdown>
                                                </div>

                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        onClick={() => playMessage(turn.agentText, index)}
                                                        className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold px-2 py-1 rounded-full transition-all ${replayingIndex === index
                                                                ? 'bg-blue-100 text-blue-600 pr-3'
                                                                : 'bg-white text-slate-500 hover:bg-blue-50 hover:text-blue-600 border border-slate-200'
                                                            }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {replayingIndex === index ? 'stop' : 'volume_up'}
                                                        </span>
                                                        {replayingIndex === index ? 'Stop' : 'Play'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <span className="text-[10px] text-slate-400 mt-2 block text-center">
                                        {turn.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </aside>

                {/* RIGHT: Main Interaction Area (3/4 width) */}
                <main className="flex-1 flex flex-col items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 to-blue-50/20">

                    {/* Active Voice Visualization */}
                    <div className="w-full max-w-2xl flex flex-col items-center justify-center flex-1">
                        <div className={`w-32 h-32 flex items-center justify-center mb-8 transition-all duration-500 ${isPlaying && replayingIndex === null ? 'scale-110' : 'scale-100'}`}>
                            <img src="/agent-avatar.png" alt="Agent" className="w-full h-full object-contain" />
                        </div>

                        {/* Live Status Indicator with Stop Buttons */}
                        <div className="flex flex-col items-center gap-3 mb-6">
                            {isPlaying && replayingIndex === null ? (
                                <>
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-100/50 text-blue-600 rounded-full">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wide">Speaking</span>
                                    </div>
                                    <button
                                        onClick={stopPlayback}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                                    >
                                        <span className="material-symbols-outlined text-sm">stop</span>
                                        Stop Audio
                                    </button>
                                </>
                            ) : isProcessing ? (
                                <>
                                    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-100/50 text-amber-600 rounded-full">
                                        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold uppercase tracking-wide">Thinking</span>
                                    </div>
                                    <button
                                        onClick={stopThinking}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                                    >
                                        <span className="material-symbols-outlined text-sm">stop</span>
                                        Stop Thinking
                                    </button>
                                </>
                            ) : isRecording ? (
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-red-100/50 text-red-600 rounded-full">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-xs font-bold uppercase tracking-wide">Listening</span>
                                </div>
                            ) : (
                                <div className="text-slate-400 text-sm font-medium">Ready to chat</div>
                            )}
                        </div>

                        {/* Live Captions */}
                        <div
                            ref={captionRef}
                            className="w-full max-w-3xl min-h-[150px] max-h-[300px] overflow-y-auto text-center px-8"
                        >
                            {currentCaption ? (
                                <p className="text-2xl font-light leading-relaxed text-slate-700">
                                    {renderLiveCaption()}
                                </p>
                            ) : (
                                <p className="text-3xl font-light text-slate-300">Tap microphone to speak...</p>
                            )}
                        </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="w-full max-w-2xl flex flex-col items-center gap-4 mt-auto pt-8">
                        <button
                            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording
                                ? 'bg-red-500 scale-110 shadow-red-500/40'
                                : isProcessing
                                    ? 'bg-slate-200 cursor-not-allowed text-slate-400'
                                    : 'btn-primary hover:scale-105 shadow-blue-500/30'
                                }`}
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            disabled={isProcessing}
                        >
                            <span className="material-symbols-outlined text-5xl">
                                {isRecording ? 'graphic_eq' : isProcessing ? 'hourglass_top' : 'mic'}
                            </span>
                        </button>
                        <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">
                            {isProcessing ? 'Processing' : isRecording ? 'Listening...' : 'Hold to Speak'}
                        </p>
                    </div>

                    {/* Error Toast */}
                    {error && (
                        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-red-500 text-white rounded-full shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-in-down">
                            <span className="material-symbols-outlined text-lg">error</span>
                            {error}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
