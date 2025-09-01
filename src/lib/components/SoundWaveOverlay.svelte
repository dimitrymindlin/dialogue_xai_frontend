<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';
    import backend from '$lib/backend';
    import type { TChatMessage } from '$lib/types';
    import { env } from '$env/dynamic/public';

    const PUBLIC_BACKEND_URL = env.PUBLIC_BACKEND_URL;
    const dispatch = createEventDispatcher();
    
    // API URL for backend communication
    const API_URL = PUBLIC_BACKEND_URL;
    
    // Global flag to check if overlay is closed
    let isOverlayClosed = false;
    
    // Props to receive user_id from parent component
    export let user_id = ''
    
    // Audio player for TTS
    let audioPlayer: HTMLAudioElement;
    
    // Error handling
    let recognitionErrorMessage = '';
    
    // Audio visualization variables
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let microphone: MediaStreamAudioSourceNode | null = null;
    let dataArray: Uint8Array;
    let animationFrameId: number;
    let isListening = false;
    let volumeLevel = 0;
    
    // Animation variables
    let planetSize = 300; // Increased base size in pixels
    let maxPlanetSize = 400; // Maximum planet size
    
    // Speech recognition variables
    // Define SpeechRecognition type
    interface SpeechRecognitionEvent extends Event {
        resultIndex: number;
        results: {
            isFinal: boolean;
            [index: number]: {
                transcript: string;
            };
            length: number;
        }[];
    }
    
    interface SpeechRecognitionErrorEvent extends Event {
        error: string;
    }
    
    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        onstart: (event: Event) => void;
        onresult: (event: SpeechRecognitionEvent) => void;
        onerror: (event: SpeechRecognitionErrorEvent) => void;
        onend: (event: Event) => void;
    }
    
    let recognition: SpeechRecognition | null = null;
    let isRecognizing = false;
    let transcript = '';
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let silenceTimeout = 1500; // 1.5 seconds of silence before sending
    let lastSpeechTime = Date.now();
    let noSpeechErrorCount = 0;
    let maxNoSpeechErrors = 3;
    let isProcessingTranscript = false; // Flag to prevent multiple API calls
    let lastTranscript = ''; // Store the last transcript sent to avoid duplicates
    let recognitionPaused = false; // New flag to track if recognition should be paused
    
    // Speech synthesis variables
    let speechSynthesis = window.speechSynthesis;
    let voices: SpeechSynthesisVoice[] = [];
    let isResponding = false;
    let responseText = '';
    let apiError = '';
    let isProcessing = false; // New variable to track API processing state
    
    // Function to close the overlay when clicking outside the content area
    function handleBackdropClick(event: MouseEvent) {
        // Only close if the click was directly on the backdrop, not on its children
        if (event.target === event.currentTarget) {
            cleanupAndClose();
        }
    }

    // Function to handle cleanup and close the overlay
    function cleanupAndClose() {
        console.log('Cleaning up and closing overlay');
        
        // Set overlay closed flag to prevent further processing
        isOverlayClosed = true;
        
        // Reset state variables immediately
        isResponding = false;
        isProcessing = false;
        isRecognizing = false;
        isListening = false;
        recognitionPaused = false;
        transcript = '';
        responseText = '';
        
        // Force stop any speech synthesis immediately
        if (speechSynthesis) {
            try {
                speechSynthesis.cancel();
                console.log('Speech synthesis canceled');
            } catch (error) {
                console.error('Error canceling speech synthesis:', error);
            }
        }
        
        // Force stop any current audio playback
        if (audioPlayer) {
            try {
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                if (audioPlayer.src) {
                    URL.revokeObjectURL(audioPlayer.src);
                    audioPlayer.src = '';
                }
                console.log('Audio playback stopped');
            } catch (error) {
                console.error('Error stopping audio playback:', error);
            }
        }
        
        // Force stop animation frame
        if (animationFrameId) {
            try {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = 0;
                console.log('Animation frame canceled');
            } catch (error) {
                console.error('Error canceling animation frame:', error);
            }
        }
        
        // Force disconnect microphone
        if (microphone && audioContext) {
            try {
                microphone.disconnect();
                microphone = null;
                console.log('Microphone disconnected');
            } catch (error) {
                console.error('Error disconnecting microphone:', error);
            }
        }
        
        // Force close audio context
        if (audioContext) {
            try {
                if (audioContext.state !== 'closed') {
                    audioContext.close();
                }
                audioContext = null;
                console.log('Audio context closed');
            } catch (error) {
                console.error('Error closing audio context:', error);
            }
        }
        
        // Force stop speech recognition
        if (recognition) {
            try {
                recognition.onend = (() => {}) as (event: Event) => void;
                recognition.stop();
                recognition = null;
                console.log('Speech recognition stopped');
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
        }
        
        // Clear any timers
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
            console.log('Silence timer cleared');
        }
        
        // Dispatch close event to parent
        dispatch('close');
        console.log('Overlay closed');
    }
    
    // Helper function to clean HTML tags and extract first paragraph for speech
    function cleanTextForSpeech(text: string): string {
        // If text doesn't contain HTML tags, return it as is
        if (!text.includes('<') && !text.includes('>')) {
            return text;
        }
        
        try {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            
            // Get the first paragraph if it exists

            
            // If no paragraphs found, return the text content of the div (strips all HTML)
            return tempDiv.textContent || '';
        } catch (error) {
            console.error('Error cleaning text for speech:', error);
            // Return original text with HTML tags removed as fallback
            return text.replace(/<\/?[^>]+(>|$)/g, '');
        }
    }
    
    // Helper function to clean HTML tags for display
    function cleanTextForDisplay(text: string): string {
        // If text doesn't contain HTML tags, return it as is
        if (!text.includes('<') && !text.includes('>')) {
            return text;
        }
        
        try {
            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            
            // Return the text content of the div (strips all HTML)
            return tempDiv.textContent || '';
        } catch (error) {
            console.error('Error cleaning text for display:', error);
            // Return original text with HTML tags removed as fallback
            return text.replace(/<\/?[^>]+(>|$)/g, '');
        }
    }
    
    // Initialize speech recognition
    function initSpeechRecognition() {
        try {
            // @ts-ignore - SpeechRecognition is not in the TypeScript types yet
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognitionAPI) {
                console.error('Speech recognition not supported in this browser');
                return;
            }
            
            recognition = new SpeechRecognitionAPI() as SpeechRecognition;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US'; // Default language
            
            recognition.onstart = () => {
                isRecognizing = true;
                recognitionErrorMessage = ''; // Clear any previous error messages
                console.log('Speech recognition started');
            };
            
            recognition.onresult = (event: SpeechRecognitionEvent) => {
                lastSpeechTime = Date.now();
                noSpeechErrorCount = 0; // Reset error count when we get results
                
                // Get the transcript
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                    } else {
                        interimTranscript += result[0].transcript;
                    }
                }
                
                // Update the transcript
                transcript = finalTranscript || interimTranscript;
                
                // Reset the silence timer
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                }
                
                // Only set a new silence timer if we have actual transcript content
                if (transcript.trim()) {
                    // Set a new silence timer
                    silenceTimer = setTimeout(() => {
                        // Only send if we have content and it's different from the last sent transcript
                        if (transcript.trim() && transcript !== lastTranscript && !isProcessingTranscript) {
                            // Pause recognition while processing to avoid loops
                            pauseRecognition();
                            sendTranscriptToAPI(transcript);
                            lastTranscript = transcript;
                            transcript = '';
                        }
                    }, silenceTimeout);
                }
            };
            
            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error('Speech recognition error', event.error);
                
                if (event.error === 'no-speech') {
                    noSpeechErrorCount++;
                    console.log(`No speech error count: ${noSpeechErrorCount}`);
                    
                    // If we've had too many no-speech errors, don't restart
                    if (noSpeechErrorCount > maxNoSpeechErrors) {
                        console.log('Too many no-speech errors, not restarting recognition');
                        isRecognizing = false;
                        recognitionErrorMessage = 'No speech detected. Please try speaking again.';
                        return;
                    }
                } else if (event.error === 'network') {
                    recognitionErrorMessage = 'Network error. Please check your internet connection and try again.';
                    isRecognizing = false;
                } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    recognitionErrorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                    isRecognizing = false;
                } else if (event.error === 'aborted') {
                    // This is usually not a problem, just log it
                    console.log('Speech recognition aborted');
                } else {
                    // For other errors
                    recognitionErrorMessage = `Speech recognition error: ${event.error}. Please try again.`;
                    isRecognizing = false;
                }
            };
            
            recognition.onend = () => {
                isRecognizing = false;
                console.log('Speech recognition ended');
                
                // Restart recognition if we're still listening, haven't had too many errors, and not paused
                if (isListening && noSpeechErrorCount <= maxNoSpeechErrors && !recognitionPaused && recognition) {
                    setTimeout(() => {
                        try {
                            recognition?.start();
                        } catch (error) {
                            console.error('Error restarting speech recognition:', error);
                        }
                    }, 300); // Small delay before restarting
                }
            };
            
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
        }
    }
    
    // Function to pause recognition
    function pauseRecognition() {
        recognitionPaused = true;
        if (recognition && isRecognizing) {
            recognition.stop();
        }
    }
    
    // Function to resume recognition
    function resumeRecognition() {
        // If overlay is closed, don't resume anything
        if (isOverlayClosed) {
            console.log('Overlay closed, not resuming recognition');
            return;
        }

        recognitionPaused = false;
        if (recognition && isListening && !isRecognizing) {
            try {
                recognition.start();
            } catch (error) {
                console.error('Error resuming speech recognition:', error);
            }
        }
    }
    
    // Initialize speech synthesis
    function initSpeechSynthesis() {
        try {
            if (!speechSynthesis) {
                console.error('Speech synthesis not supported in this browser');
                return;
            }
            
            // Load available voices
            voices = speechSynthesis.getVoices();
            
            // If voices are not loaded yet, wait for them
            if (voices.length === 0) {
                speechSynthesis.onvoiceschanged = () => {
                    voices = speechSynthesis.getVoices();
                    console.log('Voices loaded:', voices.length);
                };
            } else {
                console.log('Voices already loaded:', voices.length);
            }
            
        } catch (error) {
            console.error('Error initializing speech synthesis:', error);
        }
    }
    
    // Send transcript to API
    async function sendTranscriptToAPI(text: string) {
        // If overlay is closed, don't process anything
        if (isOverlayClosed) {
            console.log('Overlay closed, ignoring API call');
            return;
        }
        
        // Prevent multiple simultaneous API calls
        if (isProcessingTranscript) {
            console.log('Already processing a transcript, ignoring:', text);
            return;
        }
        
        // Ignore empty text
        if (!text.trim()) {
            console.log('Empty transcript, ignoring');
            resumeRecognition(); // Resume recognition if text is empty
            return;
        }
        
        try {
            console.log('Sending transcript to API:', text);
            isProcessingTranscript = true;
            isResponding = true;
            apiError = '';
            
            // Set processing state
            isProcessing = true;
            
            try {
                // Use backend.xai to send the message to the API
                console.log('Sending message to backend:', text);
                
                // Get response from backend using the same method as TTM-Chat.svelte
                let responseData: {
                    text?: string;
                    message?: string;
                    audio?: string;
                    audio_error?: string;
                } = {};
                
                await backend.xai(user_id).get_user_message_response(text)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`API error: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        responseData = data;
                        console.log('API response:', responseData);
                    });
                
                if (!responseData) {
                    throw new Error('No response data received from API');
                }
                
                // Clear processing state
                isProcessing = false;
                
                // Get the response text from the API result
                const rawResponseText = responseData.text || responseData.message || '';
                
                // Clean text for display (remove HTML tags)
                responseText = cleanTextForDisplay(rawResponseText);
                
                // Get clean text for speech (without HTML tags, only first paragraph)
                const cleanedTextForSpeech = cleanTextForSpeech(rawResponseText);
                
                // Check if audio data is included in the response
                if (responseData.audio) {
                    // Play the audio data from the response
                    playAudioFromResponse(responseData.audio);
                } else if (responseData.audio_error) {
                    // Log audio error if present
                    console.error('Audio generation error:', responseData.audio_error);
                    // Fallback to browser speech synthesis with cleaned text
                    speakResponseWithBrowser(cleanedTextForSpeech);
                } else {
                    // Fallback to browser speech synthesis with cleaned text
                    speakResponseWithBrowser(cleanedTextForSpeech);
                }
                
                // Dispatch the response to the parent component
                dispatch('response', { message: responseText });
                
                return;
            } catch (apiError) {
                console.warn('Error connecting to backend API, using fallback simulation:', apiError);
                
                // Clear processing state
                isProcessing = false;
                
                // Fallback to simulation if API call fails
                console.log('Simulating API response');
                // Wait a bit to simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Simulate a response
                const simulatedResponse = {
                    text: `"${text}"`
                };
                
                // Get the response text
                responseText = simulatedResponse.text;
                
                // Clean text for speech
                const cleanedTextForSpeech = cleanTextForSpeech(responseText);
                
                // Use browser speech synthesis for simulated response
                speakResponseWithBrowser(cleanedTextForSpeech);
                
                // Dispatch the response to the parent component
                dispatch('response', { message: responseText });
            }
            
        } catch (error) {
            console.error('Error sending transcript to API:', error);
            apiError = error instanceof Error ? error.message : 'Unknown error';
            isProcessing = false; // Clear processing state
            resumeRecognition(); // Resume recognition on error
        } finally {
            isProcessingTranscript = false;
            if (!responseText) {
                isResponding = false;
                isProcessing = false; // Clear processing state
                resumeRecognition(); // Resume recognition if no response
            }
        }
    }
    
    // Play audio data from API response
    async function playAudioFromResponse(audioData: string) {
        // If overlay is closed, don't play anything
        if (isOverlayClosed) {
            console.log('Overlay closed, ignoring audio playback');
            return;
        }

        try {
            console.log('Playing audio from API response');
            
            isResponding = true;
            
            // Convert base64 audio data to a Blob
            // The format of audioData may vary depending on how your backend sends it
            // This assumes it's a base64 encoded string
            const audioBlob = base64ToBlob(audioData);
            
            // Create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create an audio element if it doesn't exist
            if (!audioPlayer) {
                audioPlayer = new Audio();
                
                // Set up event handlers
                audioPlayer.onplay = () => {
                    // If overlay is closed, stop playback immediately
                    if (isOverlayClosed) {
                        audioPlayer.pause();
                        return;
                    }
                    
                    console.log('Audio playback started');
                    isResponding = true;
                    
                    // Start audio visualization for the response
                    startResponseVisualization();
                };
                
                audioPlayer.onended = () => {
                    // If overlay is closed, don't process anything
                    if (isOverlayClosed) {
                        return;
                    }
                    
                    console.log('Audio playback ended');
                    isResponding = false;
                    
                    // Revoke the object URL to free up memory
                    URL.revokeObjectURL(audioPlayer.src);
                    
                    // Stop audio visualization for the response
                    stopResponseVisualization();
                    
                    // Resume recognition after speaking is done
                    setTimeout(() => {
                        // Check if overlay is still open before resuming
                        if (!isOverlayClosed) {
                            resumeRecognition();
                        }
                    }, 500); // Small delay before resuming recognition
                    
                    // Clear response text after a delay to ensure it's visible
                    setTimeout(() => {
                        // Check if overlay is still open before clearing
                        if (!isOverlayClosed) {
                            responseText = '';
                        }
                    }, 3000); // Keep text visible for 3 seconds after speaking ends
                };
                
                audioPlayer.onerror = (event) => {
                    console.error('Audio playback error:', event);
                    isResponding = false;
                    // Don't clear response text immediately on error
                    // responseText = ''; // Clear response text on error
                    
                    // Revoke the object URL to free up memory
                    URL.revokeObjectURL(audioPlayer.src);
                    
                    // Stop audio visualization for the response
                    stopResponseVisualization();
                    
                    // Resume recognition after error
                    resumeRecognition();
                    
                    // Clear response text after a delay to ensure it's visible
                    setTimeout(() => {
                        responseText = '';
                    }, 3000); // Keep text visible for 3 seconds after error
                };
            } else {
                // Stop any current playback
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                
                // Revoke the previous object URL if it exists
                if (audioPlayer.src) {
                    URL.revokeObjectURL(audioPlayer.src);
                }
            }
            
            // Set the audio source to the new URL
            audioPlayer.src = audioUrl;
            
            // Play the audio
            await audioPlayer.play();
            
        } catch (error) {
            console.error('Error playing audio from response:', error);
            
            // Fallback to browser's speech synthesis if audio playback fails
            console.log('Falling back to browser speech synthesis');
            speakResponseWithBrowser(responseText);
        }
    }
    
    // Helper function to convert base64 to Blob
    function base64ToBlob(base64: string): Blob {
        // Extract content type and base64 data
        const parts = base64.split(';base64,');
        const contentType = parts.length > 1 ? parts[0].split(':')[1] : 'audio/mpeg';
        const base64Data = parts.length > 1 ? parts[1] : base64;
        
        // Decode base64
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        
        return new Blob(byteArrays, { type: contentType });
    }
    
    // Speak the response using OpenAI TTS API - No longer needed, keeping as reference
    async function speakResponseWithOpenAI(text: string) {
        try {
            console.log('Speaking response with OpenAI TTS:', text);
            
            isResponding = true;
            
            // Call the text-to-speech API
            const response = await fetch(`${API_URL}/text-to-speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text: text, 
                    voice: "alloy" // You can make this configurable if needed
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('TTS API error response:', errorText);
                throw new Error(`TTS API error: ${response.status} - ${errorText}`);
            }
            
            // Get the audio blob
            const audioBlob = await response.blob();
            
            // Create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Create an audio element if it doesn't exist
            if (!audioPlayer) {
                audioPlayer = new Audio();
                
                // Set up event handlers
                audioPlayer.onplay = () => {
                    console.log('Audio playback started');
                    isResponding = true;
                    
                    // Start audio visualization for the response
                    startResponseVisualization();
                };
                
                audioPlayer.onended = () => {
                    console.log('Audio playback ended');
                    isResponding = false;
                    responseText = ''; // Clear response text when done speaking
                    
                    // Revoke the object URL to free up memory
                    URL.revokeObjectURL(audioPlayer.src);
                    
                    // Stop audio visualization for the response
                    stopResponseVisualization();
                    
                    // Resume recognition after speaking is done
                    setTimeout(() => {
                        resumeRecognition();
                    }, 500); // Small delay before resuming recognition
                };
                
                audioPlayer.onerror = (event) => {
                    console.error('Audio playback error:', event);
                    isResponding = false;
                    responseText = ''; // Clear response text on error
                    
                    // Revoke the object URL to free up memory
                    URL.revokeObjectURL(audioPlayer.src);
                    
                    // Stop audio visualization for the response
                    stopResponseVisualization();
                    
                    // Resume recognition after error
                    resumeRecognition();
                };
            } else {
                // Stop any current playback
                audioPlayer.pause();
                audioPlayer.currentTime = 0;
                
                // Revoke the previous object URL if it exists
                if (audioPlayer.src) {
                    URL.revokeObjectURL(audioPlayer.src);
                }
            }
            
            // Set the audio source to the new URL
            audioPlayer.src = audioUrl;
            
            // Play the audio
            await audioPlayer.play();
            
        } catch (error) {
            console.error('Error speaking response with OpenAI TTS:', error);
            
            // Fallback to browser's speech synthesis if OpenAI TTS fails
            console.log('Falling back to browser speech synthesis');
            speakResponseWithBrowser(text);
        }
    }
    
    // Fallback to browser's speech synthesis
    function speakResponseWithBrowser(text: string) {
        // If overlay is closed, don't speak anything
        if (isOverlayClosed) {
            console.log('Overlay closed, ignoring speech synthesis');
            return;
        }

        try {
            if (!speechSynthesis) {
                console.error('Speech synthesis not supported in this browser');
                isResponding = false;
                resumeRecognition(); // Resume recognition if speech synthesis not supported
                return;
            }
            
            console.log('Speaking response with browser speech synthesis:', text);
            
            // Stop any current speech
            speechSynthesis.cancel();
            
            // Create a new utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Set the voice (use a female voice if available)
            // Load voices again if they're not available yet
            if (voices.length === 0) {
                voices = speechSynthesis.getVoices();
            }
            
            console.log('Available voices:', voices.length);
            
            const femaleVoice = voices.find(voice => 
                voice.name.includes('Female') || 
                voice.name.includes('female') || 
                voice.name.includes('Google') || 
                voice.name.includes('Microsoft')
            );
            
            if (femaleVoice) {
                console.log('Using voice:', femaleVoice.name);
                utterance.voice = femaleVoice;
            } else if (voices.length > 0) {
                console.log('Using default voice:', voices[0].name);
                utterance.voice = voices[0];
            }
            
            // Set other properties
            utterance.rate = 1.3; // Normal speed
            utterance.pitch = 1.3; // Normal pitch
            utterance.volume = 1.0; // Full volume
            
            // Set event handlers
            utterance.onstart = () => {
                // If overlay is closed, cancel speech immediately
                if (isOverlayClosed) {
                    speechSynthesis.cancel();
                    return;
                }
                
                isResponding = true;
                console.log('Speech synthesis started');
                
                // Start audio visualization for the response
                startResponseVisualization();
            };
            
            utterance.onend = () => {
                // If overlay is closed, don't process anything
                if (isOverlayClosed) {
                    return;
                }
                
                isResponding = false;
                console.log('Speech synthesis ended');
                
                // Stop audio visualization for the response
                stopResponseVisualization();
                
                // Resume recognition after speaking is done
                setTimeout(() => {
                    // Check if overlay is still open before resuming
                    if (!isOverlayClosed) {
                        resumeRecognition();
                    }
                }, 500); // Small delay before resuming recognition
                
                // Clear response text after a delay to ensure it's visible
                setTimeout(() => {
                    // Check if overlay is still open before clearing
                    if (!isOverlayClosed) {
                        responseText = '';
                    }
                }, 3000); // Keep text visible for 3 seconds after speaking ends
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                isResponding = false;
                // Don't clear response text immediately on error
                // responseText = ''; // Clear response text on error
                
                // Stop audio visualization for the response
                stopResponseVisualization();
                
                // Resume recognition after error
                resumeRecognition();
                
                // Clear response text after a delay to ensure it's visible
                setTimeout(() => {
                    responseText = '';
                }, 3000); // Keep text visible for 3 seconds after error
            };
            
            // Speak the utterance
            speechSynthesis.speak(utterance);
            
        } catch (error) {
            console.error('Error speaking response with browser:', error);
            isResponding = false;
            // Don't clear response text immediately on error
            // responseText = ''; // Clear response text on error
            resumeRecognition(); // Resume recognition on error
            
            // Clear response text after a delay to ensure it's visible
            setTimeout(() => {
                responseText = '';
            }, 3000); // Keep text visible for 3 seconds after error
        }
    }
    
    // Start audio visualization for the response
    function startResponseVisualization() {
        // Create a new audio context if needed
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        
        // Create a new analyser if needed
        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
        }
        
        // Start the visualization loop
        visualize();
    }
    
    // Stop audio visualization for the response
    function stopResponseVisualization() {
        // Nothing special to do here, the visualization will continue
        // but with no audio input, the volume level will be 0
    }
    
    // Start audio visualization
    async function startAudioVisualization() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create audio context and analyzer
            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            
            // Connect microphone to analyzer
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);
            
            // Create data array for frequency data
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            isListening = true;
            recognitionErrorMessage = ''; // Clear any previous error messages
            
            // Start visualization loop
            visualize();
            
            // Start speech recognition
            if (recognition && !isRecognizing) { // Only start if not already recognizing
                try {
                    recognition.start();
                    console.log('Speech recognition started initially');
                } catch (error) {
                    console.error('Error starting speech recognition:', error);
                    recognitionErrorMessage = 'Error starting speech recognition. Please refresh and try again.';
                }
            }
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            recognitionErrorMessage = 'Error accessing microphone. Please ensure your microphone is connected and you have granted permission.';
        }
    }
    
    function visualize() {
        if (!analyser) return;
        
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume level (0-1)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        volumeLevel = sum / (dataArray.length * 255);
        
        // Map volume to animation values with a maximum size limit
        planetSize = Math.min(300 + volumeLevel * 100, maxPlanetSize); // Scale between 300px and maxPlanetSize
        
        // Continue animation loop
        animationFrameId = requestAnimationFrame(visualize);
    }
    
    function stopAudioVisualization() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        
        if (microphone && audioContext) {
            microphone.disconnect();
            microphone = null;
        }
        
        if (audioContext) {
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
            audioContext = null;
        }
        
        isListening = false;
        recognitionPaused = false; // Reset the pause flag
        
        // Stop speech recognition
        if (recognition) {
            recognition.stop();
        }
        
        // Stop speech synthesis
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
    }
    
    // Add a retry button to the UI
    function handleRetryClick() {
        resetSpeechRecognition();
    }
    
    // Add a reset function to completely reset the speech recognition
    function resetSpeechRecognition() {
        // Stop current recognition if running
        if (recognition && isRecognizing) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition during reset:', error);
            }
        }
        
        // Reset variables
        isRecognizing = false;
        recognitionPaused = false;
        noSpeechErrorCount = 0;
        recognitionErrorMessage = '';
        
        // Re-initialize speech recognition
        initSpeechRecognition();
        
        // Restart if we should be listening
        if (isListening && recognition) {
            setTimeout(() => {
                try {
                    recognition?.start();
                    console.log('Speech recognition restarted after reset');
                } catch (error) {
                    console.error('Error starting speech recognition after reset:', error);
                }
            }, 500);
        }
    }
    
    // Function to skip current response and resume listening
    function skipResponse() {
        console.log('Skipping current response');
        
        // Stop any current speech
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Stop any current audio playback
        if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
        
        // Clear response text
        responseText = '';
        
        // Reset responding state
        isResponding = false;
        
        // Completely reset the audio context and microphone to ensure fresh start
        if (microphone && audioContext) {
            microphone.disconnect();
            microphone = null;
        }
        
        if (audioContext) {
            if (audioContext.state !== 'closed') {
                try {
                    audioContext.close();
                } catch (error) {
                    console.error('Error closing audio context:', error);
                }
            }
            audioContext = null;
        }
        
        // Reset recognition
        if (recognition && isRecognizing) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition during skip:', error);
            }
        }
        
        // Reset variables
        isRecognizing = false;
        recognitionPaused = false;
        noSpeechErrorCount = 0;
        
        // Small delay before restarting everything
        setTimeout(() => {
            // Restart audio visualization with fresh context
            startAudioVisualization();
            
            console.log('Audio visualization and recognition restarted after skip');
        }, 500);
    }
    
    onMount(() => {
        // Reset overlay closed flag
        isOverlayClosed = false;
        
        // Initialize speech recognition
        initSpeechRecognition();
        
        // Initialize speech synthesis
        initSpeechSynthesis();
        
        // Start audio visualization
        startAudioVisualization();
    });
    
    onDestroy(() => {
        stopAudioVisualization();
        
        // Clear any timers
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
        
        // Stop speech synthesis
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
        
        // Stop audio playback and clean up
        if (audioPlayer) {
            audioPlayer.pause();
            if (audioPlayer.src) {
                URL.revokeObjectURL(audioPlayer.src);
            }
        }
    });
</script>

<div class="overlay-backdrop" on:click={handleBackdropClick}>
    <div class="voice-visualization-container">
        <button class="close-button" on:click={cleanupAndClose}>
            <i class="fas fa-times"></i>
        </button>
        
        <div class="visualization-content">
            <div class="planet-section">
                <div class="planet-wrapper">
                    <div class="planet-container" style="width: {planetSize}px; height: {planetSize}px">
                        <div class="planet">
                            <div class="ring"></div>
                            <div class="inner-planet"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="text-section">
                <div class="status-text-container">
                    <div class="status-text">
                        {#if apiError}
                            <div class="error-text">Error: {apiError}</div>
                        {:else if recognitionErrorMessage}
                            <div class="error-text">
                                {recognitionErrorMessage}
                                <button class="retry-button" on:click={handleRetryClick}>
                                    Retry
                                </button>
                            </div>
                        {:else if isProcessing}
                            <div class="processing-text">
                                Processing<span class="dot-animation">...</span>
                            </div>
                        {:else if isResponding}
                            <div class="response-text">{responseText}</div>
                        {:else if isRecognizing && transcript}
                            <div class="transcript-text">{transcript}</div>
                        {:else if isListening}
                            Listening to your voice...
                        {:else}
                            Initializing microphone...
                        {/if}
                    </div>
                </div>
                
                {#if isResponding && !isProcessing}
                    <button class="skip-button" on:click={skipResponse}>
                        Skip
                    </button>
                {/if}
            </div>
        </div>
    </div>
</div>

<style>
    .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .voice-visualization-container {
        position: relative;
        width: 98%; /* Increased width further */
        max-width: 1000px; /* Increased max-width further */
        height: 850px; /* Increased height further */
        background-color: white;
        border-radius: 24px; /* Slightly larger border radius */
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }
    
    .close-button {
        position: absolute;
        top: 20px; /* Adjusted position */
        right: 20px; /* Adjusted position */
        background: none;
        border: none;
        font-size: 1.5rem; /* Larger font size */
        cursor: pointer;
        color: #666;
        width: 40px; /* Larger button */
        height: 40px; /* Larger button */
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        z-index: 10;
    }
    
    .close-button:hover {
        background-color: #f0f0f0;
    }
    
    .visualization-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 100%;
        position: relative;
        padding: 30px; /* Increased padding */
    }
    
    .planet-section {
        width: 100%;
        height: 55%; /* Increased height for planet section */
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 30px; /* Increased margin */
        padding: 20px; /* Added padding */
    }
    
    .text-section {
        width: 100%;
        height: 40%; /* Adjusted height for text section */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
    }
    
    .planet-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: visible; /* Changed to visible to show the full ring */
    }
    
    .planet-container {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: width 0.3s ease, height 0.3s ease;
        max-width: 85%; /* Reduced to ensure full visibility with ring */
        max-height: 85%; /* Reduced to ensure full visibility with ring */
    }
    
    .planet {
        position: relative;
        width: 100%;
        height: 100%;
        animation: float 3s ease-in-out infinite;
        transform-origin: center center;
    }

    .inner-planet {
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            110deg,
            #063970 10%,
            #1e90ff 25%,
            #63a4ff 30%,
            #2ecc71 48%,
            #1e90ff 55%,
            #63a4ff 70%,
            #063970 90%
        );
        background-size: 250% 250%;
        border-radius: 50%;
        box-shadow: 
            inset -4px -4px 8px rgba(0, 0, 0, 0.5),
            inset 4px 4px 8px rgba(255, 255, 255, 0.3),
            0 0 5px rgba(0, 0, 0, 0.2);
        animation: 
            rotate 6s linear infinite,
            moveGradient 3s ease infinite;
    }

    .ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 120%; /* Increased back to 120% since we have more space */
        height: 120%; /* Increased back to 120% since we have more space */
        transform: translate(-50%, -50%);
        border-radius: 50%;
    }

    .ring::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 3px solid transparent; /* Increased border width for better visibility */
        border-top: 3px solid #333;
        border-right: 3px solid #333;
        border-radius: 50%;
        animation: spin-reverse 3s linear infinite;
    }
    
    .status-text-container {
        width: 90%;
        max-width: 700px;
        background-color: #f5f5f5; /* Light gray background like in TTM-Chat */
        border-radius: 16px;
        padding: 25px; /* Increased padding */
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
        max-height: 300px; /* Maximum height */
        overflow-y: auto; /* Add scrolling if content is too long */
    }
    
    .status-text {
        font-size: 18px; /* Increased font size for better visibility */
        color: #333; /* Darker text color for better contrast */
        font-weight: 500;
        text-align: center;
        width: 100%;
        overflow-wrap: break-word; /* Ensure long words break */
        word-wrap: break-word;
        word-break: break-word; /* For non-standard browsers */
        hyphens: auto;
        line-height: 1.5; /* Improved line height for readability */
    }
    
    .transcript-text {
        color: #1976d2;
        font-style: italic;
        font-weight: 600; /* Make transcript text bolder */
    }
    
    .response-text {
        color: #2e7d32;
        font-weight: 600; /* Make response text bolder */
        font-size: 20px; /* Larger font size for response text */
        margin: 10px 0; /* Add margin for better spacing */
        display: block; /* Ensure it takes full width */
    }
    
    .error-text {
        color: #d32f2f;
        font-weight: 600; /* Make error text bolder */
    }
    
    .processing-text {
        color: #1976d2;
        font-weight: 600; /* Make processing text bolder */
        font-size: 20px; /* Larger font size for processing text */
    }
    
    .dot-animation {
        display: inline-block;
        animation: dotAnimation 1.5s infinite;
    }
    
    .skip-button {
        padding: 10px 30px;
        background-color: #f44336; /* Red color for skip button */
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: background-color 0.2s;
        margin-top: 10px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    }
    
    .skip-button:hover {
        background-color: #d32f2f;
    }
    
    @keyframes dotAnimation {
        0% { opacity: 0.2; }
        20% { opacity: 1; }
        100% { opacity: 0.2; }
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-reverse {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(-360deg);
        }
    }

    @keyframes rotate {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes moveGradient {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    @keyframes float {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
        100% {
            transform: translateY(0);
        }
    }

    .retry-button {
        margin-top: 10px;
        padding: 5px 15px;
        background-color: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    
    .retry-button:hover {
        background-color: #1565c0;
    }
</style> 