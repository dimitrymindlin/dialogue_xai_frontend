<script lang="ts">
    import { onDestroy, createEventDispatcher } from 'svelte';
    import OpenAI from 'openai';

    export let enabled: boolean = false;
    export let voice: string = 'coral';
    export let model: string = 'gpt-4o-mini-tts';
    export let instructions: string = 'Speak in a cheerful and positive tone, speak at 3x speed';
    export let muted: boolean = false;

    let busy: boolean = false;
    let audio: HTMLAudioElement | null = null;
    let currentUrl: string | null = null;
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.PUBLIC_OPENAI_API_KEY;
    let client: OpenAI | null = null;
    
    // Streaming TTS state
    let streamingBuffer: string = '';
    let streamingTimer: any = null;
    let isStreaming: boolean = false;
    let streamingQueue: string[] = [];
    let currentlyPlaying: boolean = false;
    let activeAudios: Set<HTMLAudioElement> = new Set();

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
        
        console.log('[TTS] Synthesizing:', text.substring(0, 50) + '...');
        
        try {
            const openai = ensureClient();
            const response = await openai.audio.speech.create({
                model,
                voice,
                input: text,
                instructions,
                response_format: 'wav' // Use wav for fastest response
            });
            
            // Convert response to blob and play immediately
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
            
            // Create temporary audio for this chunk
            const chunkAudio = new Audio();
            const chunkUrl = URL.createObjectURL(blob);
            
            return new Promise<void>((resolve, reject) => {
                chunkAudio.onended = () => {
                    URL.revokeObjectURL(chunkUrl);
                    activeAudios.delete(chunkAudio);
                    resolve();
                };
                
                chunkAudio.onerror = (e) => {
                    URL.revokeObjectURL(chunkUrl);
                    activeAudios.delete(chunkAudio);
                    reject(e);
                };
                
                chunkAudio.src = chunkUrl;
                chunkAudio.muted = muted;
                chunkAudio.volume = muted ? 0 : 1;
                console.log('[TTS] Chunk audio muted state set to:', muted);
                activeAudios.add(chunkAudio);
                
                dispatch('ttsstart');
                chunkAudio.play();
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
        
        // Use the core TTS function
        try {
            currentlyPlaying = true;
            await speakText(trimmed);
        } finally {
            currentlyPlaying = false;
        }
    }

    // Reactive debug log
    $: console.log('[TTS] enabled changed to:', enabled);
    
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
