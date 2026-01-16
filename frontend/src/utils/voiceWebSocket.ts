/**
 * WebSocket service for real-time voice chat
 */

export interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

export class VoiceWebSocket {
    private ws: WebSocket | null = null;
    private audioChunks: Uint8Array[] = [];
    private onTranscript?: (text: string) => void;
    private onResponse?: (text: string) => void;
    private onAudioChunk?: (chunk: Uint8Array, index: number, total: number) => void;
    private onAudioComplete?: (audioBlob: Blob) => void;
    private onStatus?: (message: string) => void;
    private onError?: (error: string) => void;
    private onConnect?: () => void;
    private onDisconnect?: () => void;

    constructor(
        private agentId: string,
        private token: string,
        private baseUrl: string = 'ws://localhost:8000/api/ws'
    ) { }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`${this.baseUrl}/voice/${this.agentId}`);

            this.ws.onopen = () => {
                console.log('[WS] Connected');
                // Send authentication
                this.send({ type: 'auth', token: this.token });
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.handleMessage(message);

                    // Resolve on successful auth
                    if (message.type === 'auth' && message.status === 'success') {
                        this.onConnect?.();
                        resolve();
                    }
                } catch (error) {
                    console.error('[WS] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WS] Error:', error);
                this.onError?.('WebSocket connection error');
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('[WS] Disconnected');
                this.onDisconnect?.();
            };
        });
    }

    private handleMessage(message: WebSocketMessage) {
        switch (message.type) {
            case 'auth':
                if (message.status === 'success') {
                    console.log('[WS] Authenticated for agent:', message.agent_name);
                }
                break;

            case 'transcript':
                this.onTranscript?.(message.text);
                break;

            case 'response':
                this.onResponse?.(message.text);
                break;

            case 'audio_chunk':
                const chunkData = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
                this.audioChunks.push(chunkData);
                this.onAudioChunk?.(chunkData, message.chunk_index, message.total_chunks);
                break;

            case 'audio_complete':
                // Combine all chunks into a single blob
                const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of this.audioChunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                const audioBlob = new Blob([combined], { type: 'audio/mpeg' });
                this.onAudioComplete?.(audioBlob);
                this.audioChunks = []; // Clear for next message
                break;

            case 'status':
                this.onStatus?.(message.message);
                break;

            case 'error':
                this.onError?.(message.message);
                break;

            default:
                console.warn('[WS] Unknown message type:', message.type);
        }
    }

    sendAudio(audioBlob: Blob): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                this.send({ type: 'audio', data: base64 });
                resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
    }

    private send(message: WebSocketMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('[WS] Cannot send message, not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    // Event handlers
    onTranscriptReceived(callback: (text: string) => void) {
        this.onTranscript = callback;
    }

    onResponseReceived(callback: (text: string) => void) {
        this.onResponse = callback;
    }

    onAudioChunkReceived(callback: (chunk: Uint8Array, index: number, total: number) => void) {
        this.onAudioChunk = callback;
    }

    onAudioCompleteReceived(callback: (audioBlob: Blob) => void) {
        this.onAudioComplete = callback;
    }

    onStatusUpdate(callback: (message: string) => void) {
        this.onStatus = callback;
    }

    onErrorReceived(callback: (error: string) => void) {
        this.onError = callback;
    }

    onConnected(callback: () => void) {
        this.onConnect = callback;
    }

    onDisconnected(callback: () => void) {
        this.onDisconnect = callback;
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
