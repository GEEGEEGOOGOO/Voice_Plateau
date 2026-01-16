
/**
 * Simple Audio Recorder that records to WAV format (Linear PCM)
 * which is universally supported by APIs like Groq Whisper.
 */

interface AudioRecorderOptions {
    sampleRate?: number;
}

export class WavRecorder {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private audioInput: MediaStreamAudioSourceNode | null = null;
    private chunks: Float32Array[] = [];
    private recordingLength: number = 0;
    private sampleRate: number = 16000;
    private isRecording: boolean = false;

    constructor(options: AudioRecorderOptions = {}) {
        this.sampleRate = options.sampleRate || 16000;
    }

    async start(): Promise<void> {
        this.chunks = [];
        this.recordingLength = 0;

        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: this.sampleRate
            });

            this.audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isRecording) return;

                const channelData = e.inputBuffer.getChannelData(0);
                this.chunks.push(new Float32Array(channelData));
                this.recordingLength += channelData.length;
            };

            this.audioInput.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isRecording = true;
        } catch (error) {
            console.error('Error starting recording:', error);
            throw error;
        }
    }

    async stop(): Promise<Blob> {
        this.isRecording = false;

        // Disconnect everything
        if (this.processor && this.audioInput) {
            this.audioInput.disconnect();
            this.processor.disconnect();
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }

        if (this.audioContext) {
            await this.audioContext.close();
        }

        // Merge chunks
        const mergedBuffers = this.mergeBuffers(this.chunks, this.recordingLength);
        const dataview = this.encodeWAV(mergedBuffers);
        const audioBlob = new Blob([dataview], { type: 'audio/wav' });

        return audioBlob;
    }

    private mergeBuffers(channelBuffer: Float32Array[], recordingLength: number): Float32Array {
        const result = new Float32Array(recordingLength);
        let offset = 0;
        for (let i = 0; i < channelBuffer.length; i++) {
            result.set(channelBuffer[i], offset);
            offset += channelBuffer[i].length;
        }
        return result;
    }

    private encodeWAV(samples: Float32Array): DataView {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        // RIFF identifier
        this.writeString(view, 0, 'RIFF');
        // RIFF chunk length
        view.setUint32(4, 36 + samples.length * 2, true);
        // RIFF type
        this.writeString(view, 8, 'WAVE');
        // format chunk identifier
        this.writeString(view, 12, 'fmt ');
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, 1, true);
        // channel count
        view.setUint16(22, 1, true);
        // sample rate
        view.setUint32(24, this.sampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, this.sampleRate * 2, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, 2, true);
        // bits per sample
        view.setUint16(34, 16, true);
        // data chunk identifier
        this.writeString(view, 36, 'data');
        // data chunk length
        view.setUint32(40, samples.length * 2, true);

        this.floatTo16BitPCM(view, 44, samples);

        return view;
    }

    private floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    private writeString(view: DataView, offset: number, string: string): void {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
