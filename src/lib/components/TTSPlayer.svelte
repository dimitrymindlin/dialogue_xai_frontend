<script lang="ts">
    import { onDestroy, createEventDispatcher } from 'svelte';
    import OpenAI from 'openai';
    import { env as publicEnv } from '$env/dynamic/public';

    export let enabled: boolean = false;
    export let voice: string = 'coral';
    export let model: string = 'gpt-4o-mini-tts';
    export let instructions: string = 'Speak in a cheerful and positive tone, speak at 3x speed';
    export let muted: boolean = false;

    let busy: boolean = false;
    let audio: HTMLAudioElement | null = null;
    let currentUrl: string | null = null;
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.PUBLIC_OPENAI_API_KEY || publicEnv.PUBLIC_OPENAI_API_KEY;
    let client: OpenAI | null = null;
    
    // Streaming TTS state
    let streamingBuffer: string = '';
    let streamingTimer: any = null;
    let isStreaming: boolean = false;
    let streamingQueue: string[] = [];
    let currentlyPlaying: boolean = false;
    let activeAudios: Set<HTMLAudioElement> = new Set();
    let audioUrls: Map<HTMLAudioElement, string> = new Map();
    const MAX_CHUNK_CHARS = 400; // smaller chunks for faster first-audio latency

    const dispatch = createEventDispatcher();
    console.log('[TTS] Component mounted, enabled:', enabled, 'API key available:', !!OPENAI_API_KEY);

    function ensureClient() {
        if (!client) {
            console.log('[TTS] Creating OpenAI client');
            client = new OpenAI({ apiKey: OPENAI_API_KEY, dangerouslyAllowBrowser: true });
        }
        return client;
    }

    function cleanupAudioUrl() {
        if (currentUrl) {
            try { URL.revokeObjectURL(currentUrl); } catch {}
            currentUrl = null;
        }
    }

    function stopAudio() {
        if (audio) {
            try { audio.pause(); } catch {}
            audio.currentTime = 0;
        }
        cleanupAudioUrl();
    }

    function stopAllActiveAudio() {
        try {
            activeAudios.forEach((a) => {
                try { a.pause(); } catch {}
                try { a.currentTime = 0; } catch {}
                try {
                    const url = audioUrls.get(a);
                    if (url) {
                        URL.revokeObjectURL(url);
                        audioUrls.delete(a);
                    }
                } catch {}
            });
        } finally {
            activeAudios.clear();
        }
    }

    // Add streaming text chunk
    export function addStreamingText(chunk: string) {
        if (!enabled) return;
        console.log('[TTS] Adding streaming chunk:', chunk.length, 'chars');
        streamingBuffer += chunk;
        
        // Reset timer for batching chunks
        if (streamingTimer) {
            clearTimeout(streamingTimer);
        }
        
        // Process chunk after 100ms of no new data (for sentence completion)
        streamingTimer = setTimeout(() => {
            processStreamingBuffer();
        }, 100);
    }
    
    // Process accumulated streaming buffer
    async function processStreamingBuffer() {
        if (!streamingBuffer.trim() || !enabled) return;
        
        // Look for sentence endings to create natural speech chunks
        const sentences = streamingBuffer.match(/[^.!?]*[.!?]+/g) || [];
        
        if (sentences.length > 0) {
            // Process complete sentences
            for (const sentence of sentences) {
                const trimmed = sentence.trim();
                if (trimmed) {
                    streamingQueue.push(trimmed);
                }
            }
            
            // Remove processed sentences from buffer
            const processedText = sentences.join('');
            streamingBuffer = streamingBuffer.substring(processedText.length);
            
            // Start playing if not already playing
            if (!currentlyPlaying) {
                playNextInQueue();
            }
        }
    }
    
    // Finish streaming and process remaining buffer
    export function finishStreaming() {
        if (!enabled) return;
        console.log('[TTS] Finishing streaming, remaining buffer:', streamingBuffer.length);
        
        if (streamingTimer) {
            clearTimeout(streamingTimer);
            streamingTimer = null;
        }
        
        // Add any remaining text to queue
        if (streamingBuffer.trim()) {
            streamingQueue.push(streamingBuffer.trim());
            streamingBuffer = '';
        }
        
        isStreaming = false;
        
        // Start playing if not already playing
        if (!currentlyPlaying && streamingQueue.length > 0) {
            playNextInQueue();
        }
    }
    
    // Play next item in queue
    async function playNextInQueue() {
        if (streamingQueue.length === 0) {
            currentlyPlaying = false;
            // Signal that all TTS playback has ended
            dispatch('ttsend');
            return;
        }
        
        currentlyPlaying = true;
        const textToSpeak = streamingQueue.shift()!;
        console.log('[TTS] Dequeued chunk for synthesis:', textToSpeak);
        
        try {
            await speakText(textToSpeak);
            // Continue with next in queue
            setTimeout(() => playNextInQueue(), 50); // Small gap between chunks
        } catch (e) {
            console.error('[TTS] Error playing queued text:', e);
            currentlyPlaying = false;
        }
    }
    
    // Core TTS function
    async function speakText(text: string) {
        if (!OPENAI_API_KEY) {
            console.warn('OpenAI API key missing. Set VITE_OPENAI_API_KEY or PUBLIC_OPENAI_API_KEY');
            return;
        }
        
        const t0 = performance.now();
        console.log('[TTS] Synthesizing:', text.substring(0, 50) + '...');
        
        try {
            const openai = ensureClient();
            const response = await openai.audio.speech.create({
                model,
                voice,
                input: text,
                instructions,
                response_format: 'mp3' // smaller payload for faster download
            });
            
            // Convert response to blob and play immediately
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            const t1 = performance.now();
            console.log('[TTS] Audio received in', Math.round(t1 - t0), 'ms, size:', Math.round(arrayBuffer.byteLength/1024), 'KB');
            
            // Create temporary audio for this chunk
            const chunkAudio = new Audio();
            const chunkUrl = URL.createObjectURL(blob);
            
            return new Promise<void>((resolve, reject) => {
                chunkAudio.onended = () => {
                    try { URL.revokeObjectURL(chunkUrl); } catch {}
                    activeAudios.delete(chunkAudio);
                    audioUrls.delete(chunkAudio);
                    resolve();
                };
                
                chunkAudio.onerror = (e) => {
                    try { URL.revokeObjectURL(chunkUrl); } catch {}
                    activeAudios.delete(chunkAudio);
                    audioUrls.delete(chunkAudio);
                    reject(e);
                };
                
                chunkAudio.src = chunkUrl;
                chunkAudio.muted = muted;
                chunkAudio.volume = muted ? 0 : 1;
                console.log('[TTS] Chunk audio muted state set to:', muted);
                activeAudios.add(chunkAudio);
                audioUrls.set(chunkAudio, chunkUrl);
                
                dispatch('ttsstart');
                const playPromise = chunkAudio.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.catch((e: any) => {
                        console.warn('[TTS] Audio play() was blocked or failed:', e?.name || e);
                        // Resolve to avoid deadlock; user can unmute/gesture and retrigger later
                        resolve();
                    });
                }
            });
        } catch (e) {
            console.error('TTS synthesis error:', e);
            throw e;
        }
    }
    
    // Legacy speak function for backward compatibility
    export async function speak(text: string) {
        console.log('[TTS] speak() called - enabled:', enabled, 'text length:', text?.length);
        if (!enabled) return;
        const trimmed = (text || '').trim();
        if (!trimmed) return;
        
        // Clear any ongoing streaming
        stopStreaming();
        
        // If text is very long, split into manageable chunks and queue
        if (trimmed.length > MAX_CHUNK_CHARS) {
            console.log('[TTS] Long text detected, chunking for synthesis. length:', trimmed.length);
            const sentences = trimmed.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [trimmed];
            let currentChunk = '';
            for (const s of sentences) {
                const piece = s.trim();
                if (!piece) continue;
                if ((currentChunk + ' ' + piece).trim().length > MAX_CHUNK_CHARS) {
                    streamingQueue.push(currentChunk.trim());
                    currentChunk = piece;
                } else {
                    currentChunk = (currentChunk ? currentChunk + ' ' : '') + piece;
                }
            }
            if (currentChunk.trim()) {
                streamingQueue.push(currentChunk.trim());
            }
            if (!currentlyPlaying) {
                playNextInQueue();
            }
            return;
        }
        
        // Use the core TTS function for shorter text
        try {
            currentlyPlaying = true;
            await speakText(trimmed);
        } finally {
            currentlyPlaying = false;
        }
    }

    // Reactive debug log
    $: console.log('[TTS] enabled changed to:', enabled);
    
    // When toggled off, immediately stop everything and reset state
    $: if (!enabled) {
        stopStreaming();
        stopAudio();
        stopAllActiveAudio();
        currentlyPlaying = false;
        // Notify parent that playback ended
        dispatch('ttsend');
    }
    
    // Apply mute state to audio element when muted prop changes
    $: {
        console.log('[TTS] Mute state changed to:', muted);
        if (audio) {
            audio.muted = muted;
            audio.volume = muted ? 0 : 1;
            console.log('[TTS] Main audio muted state updated to:', muted);
        }
        // Apply to all active chunk audios
        activeAudios.forEach((a) => {
            try {
                a.muted = muted;
                a.volume = muted ? 0 : 1;
            } catch {}
        });
    }

    // Stop streaming
    function stopStreaming() {
        isStreaming = false;
        streamingBuffer = '';
        streamingQueue = [];
        currentlyPlaying = false;
        
        if (streamingTimer) {
            clearTimeout(streamingTimer);
            streamingTimer = null;
        }
    }
    
    onDestroy(() => {
        console.log('[TTS] Component destroyed');
        stopStreaming();
        stopAudio();
        audio = null;
    });
</script>

<div style="display:none"></div>
