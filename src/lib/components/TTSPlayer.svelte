<script lang="ts">
    import { onDestroy } from 'svelte';
    import OpenAI from 'openai';

    export let enabled: boolean = false;
    export let voice: string = 'coral';
    export let model: string = 'gpt-4o-mini-tts';
    export let instructions: string | undefined;
    export let muted: boolean = false;

    let busy: boolean = false;
    let audio: HTMLAudioElement | null = null;
    let currentUrl: string | null = null;
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.PUBLIC_OPENAI_API_KEY;
    let client: OpenAI | null = null;

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

    export async function speak(text: string) {
        console.log('[TTS] speak() called - enabled:', enabled, 'text length:', text?.length, 'busy:', busy);
        if (!enabled) return;
        const trimmed = (text || '').trim();
        if (!trimmed) return;
        if (!OPENAI_API_KEY) {
            console.warn('OpenAI API key missing. Set VITE_OPENAI_API_KEY or PUBLIC_OPENAI_API_KEY');
            return;
        }
        if (busy) {
            console.log('[TTS] Already busy, stopping previous audio');
            stopAudio();
        }
        busy = true;
        console.log('[TTS] Starting synthesis for:', trimmed.substring(0, 100) + '...');
        try {
            const openai = ensureClient();
            console.log('[TTS] Calling OpenAI API');
            const response = await openai.audio.speech.create({
                model,
                voice,
                input: trimmed,
                instructions,
                response_format: 'mp3' // Use mp3 instead of wav
            });
            console.log('[TTS] API response received, creating audio blob');
            
            // Convert response to blob and play
            const arrayBuffer = await response.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            
            // Clean up previous URL
            cleanupAudioUrl();
            currentUrl = URL.createObjectURL(blob);
            
            // Create or reuse audio element
            if (!audio) {
                audio = new Audio();
                audio.onended = () => {
                    console.log('[TTS] Audio playback ended');
                    busy = false;
                };
                audio.onerror = (e) => {
                    console.error('[TTS] Audio element error:', e);
                    busy = false;
                };
            }
            
            audio.src = currentUrl;
            audio.muted = muted; // Apply current mute state
            console.log('[TTS] Starting audio playback, muted:', muted);
            await audio.play();
            console.log('[TTS] Audio playback started successfully');
        } catch (e) {
            console.error('TTS playback error:', e);
            busy = false;
        }
    }

    // Reactive debug log
    $: console.log('[TTS] enabled changed to:', enabled);
    
    // Apply mute state to audio element when muted prop changes
    $: if (audio) {
        audio.muted = muted;
        console.log('[TTS] Audio muted state changed to:', muted);
    }

    onDestroy(() => {
        console.log('[TTS] Component destroyed');
        stopAudio();
        audio = null;
    });
</script>

<div style="display:none"></div>
