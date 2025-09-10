<script lang="ts">
    import type {TChatMessage} from '$lib/types';
    import {afterUpdate, beforeUpdate} from 'svelte';
    import Header from './Header.svelte';
    import TTSPlayer from '$lib/components/TTSPlayer.svelte';
    import Message from './Message.svelte';
    import ProgressMessage from './ProgressMessage.svelte'; // Import our new component
    import {createEventDispatcher} from 'svelte';
    import SubmitButton from "$lib/components/SubmitButton.svelte";
    import backend from '$lib/backend'; // Add backend import
    import {getDatasetConfig} from '$lib/dataset-configs';
    import {env} from '$env/dynamic/public';
    const PUBLIC_BACKEND_URL = env.PUBLIC_BACKEND_URL;
    import { userDemographics } from '$lib/stores';

    export let messages: TChatMessage[] = [];
    let element: HTMLElement;
    let inputMessage = '';
    export let user_input = true;
    export let study_group = '';
    export let user_id = '';
    export let dataset: string = env.PUBLIC_DATASET_NAME || 'adult';
    let isRecording = false;
    let audioRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isProcessingSpeech = false;
    let hasText = false; // New variable to track if there's text in the input
    let showSoundWaveOverlay = false; // New variable to control overlay visibility
    let isWaitingForResponse = false; // New variable to track if we are waiting for a backend response
    let isVoiceMode = false; // Voice recognition mode
    let voiceRecognition: any = null;
    let voiceTranscript = '';
    let silenceTimer: any = null;
    let isVoiceProcessing = false;
    let processingWatchdog: any = null;
    let demographicsGatePending = false; // Resume mic only after demographics chunk
    let ttsEnabled: boolean = false;
    let ttsMuted: boolean = false;
    let ttsRef: any = null;
    let lastSpokenMessageId: number | null = null;
    let isTTSAudioPlaying: boolean = false; // gate STT resume while TTS is speaking
    let instructions: string = "Speak in a cheerful and positive tone, speak at 3x speed";
    // Debug TTS state changes
    $: console.log('[TTS] Toggle state changed:', ttsEnabled, 'ttsRef available:', !!ttsRef, 'muted:', ttsMuted);

    // Get dataset-specific configuration including chat suggestions
    $: datasetConfig = getDatasetConfig(dataset);
    $: chatSuggestions = datasetConfig.chatSuggestions;
    function startProcessingWatchdog() {
        if (processingWatchdog) {
            clearTimeout(processingWatchdog);
            processingWatchdog = null;
        }
        // Force recovery if we get stuck in processing
        processingWatchdog = setTimeout(() => {
            try {
                if (isVoiceMode && isVoiceProcessing) {
                    // Also ensure TTS playback has finished before resuming
                    if (!demographicsGatePending && !isTTSAudioPlaying) {
                        console.warn('Processing watchdog fired - forcing resume');
                        isVoiceProcessing = false;
                        startVoiceRecognition();
                    } else {
                        console.warn('Processing watchdog fired but demographics not received yet; keeping mic paused');
                    }
                }
            } catch (e) {
                console.error('Watchdog resume error:', e);
                isVoiceProcessing = false;
            }
        }, 8000);
    }

    function clearProcessingWatchdog() {
        if (processingWatchdog) {
            clearTimeout(processingWatchdog);
            processingWatchdog = null;
        }
    }

    // Autocomplete suggestions for the chat input with substituted attributes
    let suggestions = [
        "Explain this prediction to me",
        "Why under 50k?",
        "Why over 50k?",
        "Why do you think so?",
        "What factors matter the most in how the model makes its decision?",
        "Which features play the strongest role in influencing the model's prediction?",
        "What factors have very little effect on the model's decision?",
        "Which features contribute the least to the model's prediction?",
        "How much does each feature influence the prediction for this person?",
        "How strong is the effect of each factor on this person's outcome?",
        "What features would have to change to get a different prediction?",
        "Which factors must be altered for the model to predict something else?",
        "What set of features matters the most for this individual's prediction?",
        "Which collection of factors is most crucial for this person's result?",
        "How sure is the model about its prediction for this individual?",
        "What level of certainty does the model have regarding this person's prediction?",
        "Would the model's prediction change if just the Occupation were different?",
        "If we only alter the Occupation, does the prediction for this person shift?",
        "In general, how does someone's Occupation relate to the model's prediction?",
        "What is the typical relationship between Occupation and the model's decision?",
        "What is the spread of Age values across the dataset?",
        "How do the various Age values compare throughout the dataset?"
    ];

    // Filter suggestions based on the input text
    $: filteredSuggestions = inputMessage.trim()
        ? chatSuggestions.filter(s => s.toLowerCase().includes(inputMessage.toLowerCase()))
        : [];

    let autoscroll = false;

    const dispatch = createEventDispatcher();

    // Watch for changes in inputMessage to toggle hasText
    $: hasText = inputMessage.trim().length > 0;
    
    // Watch for new messages and resume voice recognition if needed
    $: if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        console.log('Reactive: lastMessage check - isUser:', lastMessage?.isUser, 'isStreaming:', lastMessage?.isStreaming, 'isVoiceMode:', isVoiceMode, 'isVoiceProcessing:', isVoiceProcessing);
        if (!lastMessage.isUser && !lastMessage.isStreaming && isVoiceMode && isVoiceProcessing) {
            console.log('Detected AI message completion, scheduling voice resume');
            setTimeout(() => {
                console.log('Reactive timeout executing - isVoiceMode:', isVoiceMode, 'isVoiceProcessing:', isVoiceProcessing, 'isTTSAudioPlaying:', isTTSAudioPlaying);
                if (isVoiceMode && isVoiceProcessing && !isTTSAudioPlaying) {
                    console.log('Auto-resuming voice recognition after message completion (reactive)');
                    isVoiceProcessing = false;
                    try {
                        startVoiceRecognition();
                    } catch (error) {
                        console.error('Error in reactive voice resume:', error);
                        isVoiceProcessing = false;
                    }
                } else if (isTTSAudioPlaying) {
                    console.log('TTS is playing, deferring voice resume (reactive)');
                }
            }, 2000);
        }
    }

    // TTS: when toggle enabled, auto-speak the latest complete AI message (ONLY for non-streaming messages)
    $: if (ttsEnabled && messages && messages.length > 0) {
        console.log('[TTS] Reactive check - enabled:', ttsEnabled, 'messages count:', messages.length, 'ttsRef:', !!ttsRef);
        // Find latest AI message - include streaming ones that have accumulated text
        const latestAi = [...messages].reverse().find(m => {
            const isAi = !m.isUser;
            const hasText = m.text && m.text.trim().length > 0;
            const isComplete = !m.isStreaming; // Only speak when streaming is complete
            console.log('[TTS] Checking message:', { id: m.id, isAi, hasText, isComplete, isStreaming: m.isStreaming });
            return isAi && hasText && isComplete;
        });
        console.log('[TTS] Latest AI message:', latestAi ? { id: latestAi.id, textLength: latestAi.text?.length, isStreaming: latestAi.isStreaming } : 'none');
        console.log('[TTS] Last spoken ID:', lastSpokenMessageId);
        
        // ONLY speak if this message was NOT processed by streaming TTS
        if (latestAi && Number(latestAi.id) !== lastSpokenMessageId && ttsRef) {
            // Check if this message was created via streaming (has been processed already)
            const wasStreamingMessage = latestAi.text && latestAi.text.includes('<') && latestAi.text.includes('>');
            
            if (!wasStreamingMessage) {
                console.log('[TTS] About to speak NON-STREAMING message ID:', latestAi.id);
                try {
                    ttsRef.speak(String(latestAi.text));
                    lastSpokenMessageId = Number(latestAi.id);
                    console.log('[TTS] Updated lastSpokenMessageId to:', lastSpokenMessageId);
                } catch (e) {
                    console.warn('TTS reactive speak error', e);
                }
            } else {
                console.log('[TTS] Skipping streaming message (already processed):', latestAi.id);
                lastSpokenMessageId = Number(latestAi.id); // Mark as processed to avoid future attempts
            }
        }
    }

    function forwardFeedback(event: CustomEvent) {
        dispatch('feedbackButtonClick', event.detail);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Stop the form from submitting
            sendMessage();
        }
    }

    function sendMessage() {
        if (inputMessage.trim() === '') return;

        
        // Pause voice recognition during processing but keep voice mode active
        if (isVoiceMode) {
            // isVoiceProcessing should already be set by the timer or manual call
            if (!isVoiceProcessing) {
                isVoiceProcessing = true;
            }
            // Gate resume until demographics arrives
            demographicsGatePending = true;
            startProcessingWatchdog();
            if (voiceRecognition) {
                voiceRecognition.stop();
            }
            // Clear any existing timers
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
        }
        
        // Create user message
        const userMessage: TChatMessage = {
            id: Date.now(),
            text: inputMessage,
            isUser: true,
            feedback: false
        };
        messages = [...messages, userMessage];

        const userInput = inputMessage;
        inputMessage = '';

        // --- Start loading logic ---
        let responseStarted = false;
        const timer = setTimeout(() => {
            if (!responseStarted) {
                isWaitingForResponse = true;
            }
        }, 1000); // Show loading indicator after 1 second

        const handleResponseStart = () => {
            if (responseStarted) return; // Ensure this only runs once
            responseStarted = true;
            clearTimeout(timer);
            isWaitingForResponse = false;
        };
        // --- End loading logic ---

        voiceTranscript = '';
        
        if (STREAMING_OPTION) {
            // Use streaming API
            let aiMessageId: number | null = null;
            let hasCreatedAiMessage = false;

            console.log('Sending message with streaming:', userInput);
            backend.xai(user_id).get_user_message_response_stream(userInput, (chunk) => {
                handleResponseStart(); // Hide loading indicator on first chunk
                console.log('Received stream chunk:', chunk);

                // Create AI message placeholder on first chunk
                if (!hasCreatedAiMessage) {
                    aiMessageId = Date.now() + 1;
                    const aiMessage: TChatMessage = {
                        id: aiMessageId,
                        text: '',
                        isUser: false,
                        feedback: true,
                        isStreaming: true
                    };
                    messages = [...messages, aiMessage];
                    hasCreatedAiMessage = true;
                }
                
                // Find the AI message to update
                const messageIndex = messages.findIndex(m => m.id === aiMessageId);
                if (messageIndex === -1) return;
                
                if (chunk.type === 'partial') {
                    // Update message text incrementally
                    messages[messageIndex].text += chunk.content;
                    messages[messageIndex].isStreaming = true;
                    messages = messages; // Trigger reactivity
                    
                    // TTS: Add streaming chunk for real-time synthesis
                    if (ttsEnabled && ttsRef && chunk.content) {
                        console.log('[TTS] Adding streaming chunk:', chunk.content.length, 'chars');
                        ttsRef.addStreamingText(chunk.content);
                    }
                } else if (chunk.type === 'final') {
                    // Final update with complete data
                    messages[messageIndex] = {
                        ...messages[messageIndex],
                        text: chunk.content,
                        isStreaming: false,
                        feedback: chunk.feedback !== false,
                        followup: chunk.followup || [],
                        reasoning: chunk.reasoning || '',
                        question_id: chunk.question_id,
                        feature_id: chunk.feature_id,
                        audio: chunk.audio,
                        audio_error: chunk.audio_error
                    };
                    messages = messages; // Trigger reactivity
                    
                    // TTS: Finish streaming and speak any remaining content
                    if (ttsEnabled && ttsRef) {
                        console.log('[TTS] Finishing streaming for messageId:', aiMessageId);
                        try { 
                            ttsRef.finishStreaming();
                            if (aiMessageId) { 
                                lastSpokenMessageId = Number(aiMessageId);
                                console.log('[TTS] Streaming finished, marked as spoken:', lastSpokenMessageId);
                            }
                        } catch (e) { console.warn('TTS finish streaming error', e); }
                    }
                    
                    // Do NOT resume here if we require demographics first
                    console.log('Stream complete (MAIN final) - isVoiceMode:', isVoiceMode, 'isVoiceProcessing:', isVoiceProcessing, 'demographicsGatePending:', demographicsGatePending);
                    if (!demographicsGatePending) {
                        clearProcessingWatchdog();
                        if (isVoiceMode) {
                            setTimeout(() => {
                                console.log('About to resume voice recognition - isVoiceMode:', isVoiceMode);
                                isVoiceProcessing = false;
                                if (isVoiceMode && !voiceRecognition?.recognizing) {
                                    console.log('Resuming voice recognition after AI response (streaming)');
                                    try {
                                        startVoiceRecognition();
                                    } catch (error) {
                                        console.error('Error resuming voice recognition (streaming):', error);
                                        isVoiceProcessing = false;
                                    }
                                }
                            }, 1000);
                        } else {
                            isVoiceProcessing = false;
                        }
                    }
                    
                    // Dispatch event for logging purposes (if parent needs it)
                    dispatch('streamComplete', {
                        message: userInput,
                        response: messages[messageIndex]
                    });
                } else if (chunk.type === 'error') {
                    // Handle error
                    messages[messageIndex] = {
                        ...messages[messageIndex],
                        text: chunk.content || 'An error occurred while processing your request.',
                        isStreaming: false,
                        feedback: false
                    };
                    messages = messages; // Trigger reactivity
                }
                else if (chunk.type === 'demographics') {
                    console.log('Received demographics chunk:', chunk);
                    if(chunk.content){
                        userDemographics.set(chunk.content);
                    }
                    
                    // TTS: Also finish streaming when demographics arrive (end of response)
                    if (ttsEnabled && ttsRef) {
                        console.log('[TTS] Demographics received, finishing any remaining streaming');
                        try {
                            ttsRef.finishStreaming();
                        } catch (e) {
                            console.warn('TTS finish on demographics error', e);
                        }
                    }
                    // Resume mic now that demographics arrived
                    if (isVoiceMode && isVoiceProcessing && demographicsGatePending && !isTTSAudioPlaying) {
                        console.log('Demographics arrived - resuming mic');
                        clearProcessingWatchdog();
                        demographicsGatePending = false;
                        isVoiceProcessing = false;
                        try {
                            startVoiceRecognition();
                        } catch (error) {
                            console.error('Error resuming after demographics:', error);
                            isVoiceProcessing = false;
                        }
                    }
                }
                else if (chunk.type === 'final') {
                    // This is the final chunk, resume voice recognition if needed
                    console.log('Final chunk received (SECONDARY final) - checking voice mode');
                    // Only resume if no gate
                    if (!demographicsGatePending && !isTTSAudioPlaying) {
                        clearProcessingWatchdog();
                        if (isVoiceMode) {
                            setTimeout(() => {
                                console.log('Auto-resuming voice recognition after final chunk (SECONDARY)');
                                isVoiceProcessing = false;
                                if (isVoiceMode && !voiceRecognition?.recognizing) {
                                    try {
                                        startVoiceRecognition();
                                    } catch (error) {
                                        console.error('Error resuming voice recognition (secondary final):', error);
                                        isVoiceProcessing = false;
                                    }
                                }
                            }, 1500);
                        }
                    }
                }
            }).catch(error => {
                handleResponseStart(); // Also handle on error
                console.error('Stream error:', error);

                clearProcessingWatchdog();
                demographicsGatePending = false;
                
                // Create AI message for error if not created yet
                if (!hasCreatedAiMessage) {
                    aiMessageId = Date.now() + 1;
                    const errorMessage: TChatMessage = {
                        id: aiMessageId,
                        text: 'Sorry, an error occurred while processing your request.',
                        isUser: false,
                        feedback: false,
                        isStreaming: false
                    };
                    messages = [...messages, errorMessage];
                } else {
                    // Update existing message with error
                    const messageIndex = messages.findIndex(m => m.id === aiMessageId);
                    if (messageIndex !== -1) {
                        messages[messageIndex] = {
                            ...messages[messageIndex],
                            text: 'Sorry, an error occurred while processing your request.',
                            isStreaming: false,
                            feedback: false
                        };
                        messages = messages;
                    }
                }
            }).finally(() => {
                // Ensure streaming is marked as complete even if no final chunk
                if (hasCreatedAiMessage && aiMessageId) {
                    const messageIndex = messages.findIndex(m => m.id === aiMessageId);
                    if (messageIndex !== -1 && messages[messageIndex].isStreaming) {
                        console.log('[TTS] Marking stream as complete in finally block');
                        messages[messageIndex] = {
                            ...messages[messageIndex],
                            isStreaming: false
                        };
                        messages = messages; // Trigger reactivity
                    }
                }
            });
        } else {
            // Use non-streaming API
            console.log('Sending message without streaming:', userInput);

            backend.xai(user_id).get_user_message_response(userInput)
                .then(response => response.json())
                .then(data => {
                    handleResponseStart();
                    // Create AI message when response arrives
                    const aiMessage: TChatMessage = {
                        id: Date.now() + 1,
                        text: data.text,
                        isUser: false,
                        feedback: data.feedback !== false,
                        followup: data.followup || [],
                        reasoning: data.reasoning || '',
                        question_id: data.question_id,
                        feature_id: data.feature_id,
                        audio: data.audio,
                        audio_error: data.audio_error
                    };
                    messages = [...messages, aiMessage]; // Add new message

                    // TTS: speak non-streaming response
                    if (ttsEnabled && ttsRef && aiMessage.text) {
                        console.log('[TTS] Speaking non-streaming response, messageId:', aiMessage.id);
                        try { 
                            ttsRef.speak(String(aiMessage.text)); 
                            lastSpokenMessageId = Number(aiMessage.id);
                        } catch (e) { console.warn('TTS speak error', e); }
                    }
                    
                    // Resume voice recognition after response
                    console.log('Non-stream complete - isVoiceMode:', isVoiceMode, 'isVoiceProcessing:', isVoiceProcessing);
                    clearProcessingWatchdog();
                    if (!demographicsGatePending && !isTTSAudioPlaying) {
                        if (isVoiceMode) {
                            setTimeout(() => {
                                console.log('About to resume voice recognition (non-stream) - isVoiceMode:', isVoiceMode);
                                isVoiceProcessing = false;
                                if (isVoiceMode && !voiceRecognition?.recognizing) {
                                    console.log('Resuming voice recognition after AI response (non-streaming)');
                                    try {
                                        startVoiceRecognition();
                                    } catch (error) {
                                        console.error('Error resuming voice recognition (non-streaming):', error);
                                        isVoiceProcessing = false;
                                    }
                                }
                            }, 1000);
                        } else {
                            isVoiceProcessing = false;
                        }
                    }
                    
                    // Dispatch event for logging purposes (if parent needs it)
                    dispatch('streamComplete', {
                        message: userInput,
                        response: aiMessage
                    });
                })
                .catch(error => {
                    handleResponseStart();
                    console.error('Non-streaming API error:', error);

                    clearProcessingWatchdog();
                    
                    // Create error message
                    const errorMessage: TChatMessage = {
                        id: Date.now() + 1,
                        text: 'Sorry, an error occurred while processing your request.',
                        isUser: false,
                        feedback: false
                    };
                    messages = [...messages, errorMessage];
                });
        }
    }

    async function next(e: any) {
        e.preventDefault();
        dispatch('next', null);
    }

    function selectSuggestion(suggestion: string) {
        inputMessage = suggestion;
        sendMessage();
    }

    // Speech recognition functions
    async function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    // Voice recognition functions
    function handleSoundWaveClick() {
        console.log('Sound wave button clicked - current state:', { isVoiceMode, isVoiceProcessing });
        if (isVoiceMode) {
            if (isVoiceProcessing) {
                // If stuck in processing, force resume
                console.log('Force resuming voice recognition from processing state');
                isVoiceProcessing = false;
                startVoiceRecognition();
            } else {
                // Normal stop
                stopVoiceRecognition();
            }
        } else {
            startVoiceRecognition();
        }
    }

    function startVoiceRecognition() {
        try {
            console.log('startVoiceRecognition called - current state:', { isVoiceMode, isVoiceProcessing, hasExistingRecognition: !!voiceRecognition });
            
            // Stop any existing recognition first
            if (voiceRecognition) {
                try {
                    voiceRecognition.stop();
                } catch (e) {
                    console.log('Error stopping existing recognition:', e);
                }
                voiceRecognition = null;
            }
            
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                console.error('Speech recognition not supported');
                return;
            }

            voiceRecognition = new SpeechRecognition();
            voiceRecognition.continuous = true;
            voiceRecognition.interimResults = true;
            voiceRecognition.lang = 'en-US';

            voiceRecognition.onstart = () => {
                isVoiceMode = true;
                console.log('Voice recognition started - isVoiceMode:', isVoiceMode);
            };

            voiceRecognition.onresult = (event: any) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                voiceTranscript = finalTranscript || interimTranscript;
                inputMessage = voiceTranscript;
                
                // Clear existing timer
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                }
                
                // Set new timer for auto-submit after 3 seconds of silence
                if (voiceTranscript.trim()) {
                    silenceTimer = setTimeout(() => {
                        if (voiceTranscript.trim() && !isVoiceProcessing && isVoiceMode) {
                            console.log('Auto-submitting after silence:', voiceTranscript);
                            // Set processing state before sending message
                            isVoiceProcessing = true;
                            sendMessage();
                            // Clear transcript after sending
                            voiceTranscript = '';
                        }
                    }, 3000);
                }
            };

            voiceRecognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                
                // Handle different error types
                if (event.error === 'no-speech') {
                    console.log('No speech detected - this is normal, continuing...');
                    // Don't stop recognition for no-speech, it's normal
                    return;
                } else if (event.error === 'aborted') {
                    console.log('Speech recognition aborted - this is normal');
                    // Don't stop recognition for aborted, it's normal
                    return;
                } else if (event.error === 'network') {
                    console.error('Network error in speech recognition');
                    // Stop for network errors
                    stopVoiceRecognition();
                } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    console.error('Microphone access denied');
                    // Stop for permission errors
                    stopVoiceRecognition();
                } else {
                    console.error('Unknown speech recognition error:', event.error);
                    // Don't stop for unknown errors, let it continue
                }
            };

            voiceRecognition.onend = () => {
                console.log('Voice recognition ended - isVoiceMode:', isVoiceMode, 'isVoiceProcessing:', isVoiceProcessing, 'isTTSAudioPlaying:', isTTSAudioPlaying);
                if (isVoiceMode && !isVoiceProcessing) {
                    // Only restart if not processing a message and TTS not playing
                    setTimeout(() => {
                        if (isVoiceMode && !isVoiceProcessing && !isTTSAudioPlaying && voiceRecognition) {
                            console.log('Restarting voice recognition after 3s idle...');
                            try {
                                voiceRecognition.start();
                            } catch (error) {
                                console.error('Error restarting voice recognition:', error);
                                // Reset state if restart fails
                                isVoiceProcessing = false;
                            }
                        } else if (isTTSAudioPlaying) {
                            console.log('Deferring recognition restart because TTS is still playing');
                        }
                    }, 3000);
                }
            };

            voiceRecognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
        }
    }

    function stopVoiceRecognition() {
        console.log('Stopping voice recognition - isVoiceMode was:', isVoiceMode);
        isVoiceMode = false;
        isVoiceProcessing = false;
        voiceTranscript = '';
        clearProcessingWatchdog();
        
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
        
        if (voiceRecognition) {
            voiceRecognition.stop();
            voiceRecognition = null;
        }
        
        console.log('Voice recognition stopped - isVoiceMode now:', isVoiceMode);
    }

    async function startRecording() {
        try {
            console.log('Starting audio recording...');
            audioChunks = [];
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted');
            
            // Create MediaRecorder
            audioRecorder = new MediaRecorder(stream);
            
            // Event handler for when data is available
            audioRecorder.ondataavailable = (event) => {
                console.log('Audio data available:', event.data.size, 'bytes');
                audioChunks.push(event.data);
            };
            
            // Event handler for when recording stops
            audioRecorder.onstop = async () => {
                console.log('Recording stopped, processing audio...');
                isProcessingSpeech = true;
                
                try {
                    
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('Audio blob created:', audioBlob.size, 'bytes');
                    
                    
                    const formData = new FormData();
                    formData.append('audio_file', audioBlob, 'recording.webm');
                    formData.append('user_id', user_id || 'TEST_USER');
                    
                    
                    //const apiUrl = `${base}/speech-to-text`;
                    const apiUrl = PUBLIC_BACKEND_URL + "/speech-to-text";
                    console.log('Sending audio to API:', apiUrl);
                    
                    
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('API error response:', errorText);
                        throw new Error(`API error: ${response.status} - ${errorText}`);
                    }
                    
                    const result = await response.json();
                    console.log('Transcription result:', result);
                    
                    // Place transcript result in input field
                    inputMessage = result.text;
                    
                } catch (error: unknown) {
                    console.error('Transcription error:', error);
                    // Notify user in case of error
                    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                    alert(`Speech recognition error: ${errorMessage}`);
                } finally {
                    isProcessingSpeech = false;
                }
                
                // Close microphone access
                if (audioRecorder && isRecording) {
                    audioRecorder.stream.getTracks().forEach(track => track.stop());
                }
            };
            
            // Start recording
            audioRecorder.start();
            console.log('Recording started');
            isRecording = true;
            
        } catch (error: unknown) {
            console.error('Recording error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            alert(`Microphone access error: ${errorMessage}`);
        }
    }

    function stopRecording() {
        if (audioRecorder && isRecording) {
            audioRecorder.stop();
            isRecording = false;
        }
    }

    beforeUpdate(() => {
        if (element) {
            const scrollableDistance = element.scrollHeight - element.offsetHeight;
            autoscroll = element.scrollTop > scrollableDistance - 20;
        }
    });

    afterUpdate(() => {
        if (autoscroll) {
            element.scrollTo(0, element.scrollHeight);
        }
    });

    // Add environment variable for message icon
    const SPEECH_RECOGNITION = import.meta.env.VITE_SPEECH_RECOGNITION === 'true';
    const STREAMING_OPTION = import.meta.env.VITE_STREAMING_OPTION === 'true'; // Default: false
    const STREAMING_OPTION = import.meta.env.VITE_STREAMING_OPTION !== 'false'; // Default: true
    
    // Cleanup on component destroy
    import { onDestroy } from 'svelte';
    
    onDestroy(() => {
        stopVoiceRecognition();
    });
</script>

<svelte:head>
    <!-- Add Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<div class="ttm flex h-full">
        <Header>
            <div class="header-row">
                <span>Chatbot</span>
                <div class="tts-controls">
                    <div class="tts-toggle">
                        <label class="switch">
                            <input type="checkbox" bind:checked={ttsEnabled}>
                            <span class="slider"></span>
                        </label>
                        <span class="tts-label">TTS</span>
                    </div>
                    <button 
                        class="mute-button {!ttsEnabled ? 'disabled' : ''}" 
                        on:click={() => ttsMuted = !ttsMuted}
                        title={ttsMuted ? 'Unmute' : 'Mute'}
                        disabled={!ttsEnabled}
                    >
                        {#if ttsMuted}
                            <i class="fas fa-volume-mute"></i>
                        {:else}
                            <i class="fas fa-volume-up"></i>
                        {/if}
                    </button>
                </div>
            </div>
        </Header>
    <main bind:this={element} class="flex-1 overflow-y-auto h-full p-3">
        {#each messages as message}
            <Message {message} on:feedbackButtonClick={forwardFeedback} on:questionClick={(e) => dispatch('questionClick', e.detail)}/>
        {/each}

        <!-- Show progress message if we are waiting for a response from the backend -->
        {#if isWaitingForResponse}
        <!-- Show progress message if the last message is from the user and no AI response yet -->
        {#if messages.length && messages[messages.length - 1].isUser}
            <ProgressMessage/>
        {/if}
    </main>

    {#if user_input}
        <!-- Left-aligned notice above the chat field -->
        <div class="notice">
            <p><b>Do Not Provide Personal Information</b>: Your messages go to OpenAI. Don't share personal data.</p>
        </div>

        <div class="input-container">
            <div class="input-wrapper">
                {#if filteredSuggestions.length > 0}
                    <ul class="suggestions">
                        {#each filteredSuggestions as suggestion}
                            <button class="suggestion-item" on:click={() => selectSuggestion(suggestion)}>{suggestion}</button>
                        {/each}
                    </ul>
                {/if}
                <input
                    type="text"
                    bind:value={inputMessage}
                    placeholder="Start typing to get question suggestion or ask your own question..."
                    on:keydown={handleKeydown}
                />
            </div>
            
            {#if SPEECH_RECOGNITION}
                <!-- Show only microphone and speech icons -->
                <div class="voice-recognition-section">
                    <button 
                        type="button"
                        class="microphone-button {isRecording ? 'recording' : ''} {isProcessingSpeech ? 'processing' : ''}"
                        on:click={toggleRecording}
                        disabled={isProcessingSpeech}
                        title={isRecording ? "Stop recording" : "Start recording"}
                    >
                        {#if isRecording}
                            <i class="fas fa-stop"></i>
                        {:else if isProcessingSpeech}
                            <div class="loading-circle"></div>
                        {:else}
                            <i class="fas fa-microphone"></i>
                        {/if}
                    </button>
                    <div class="voice-wave-container {isRecording ? 'active' : ''}">
                        {#if isRecording}
                            <div class="voice-wave">
                                <span class="wave-bar"></span>
                                <span class="wave-bar"></span>
                                <span class="wave-bar"></span>
                                <span class="wave-bar"></span>
                                <span class="wave-bar"></span>
                            </div>
                        {:else}
                            <button 
                                type="button"
                                class="sound-wave-button {isVoiceMode ? 'active' : ''}"
                                on:click={handleSoundWaveClick}
                                title={isVoiceMode ? (isVoiceProcessing ? 'Voice processing... (click to resume)' : 'Stop voice recognition') : 'Start voice recognition'}
                            >
                                <div class="voice-circle-container">
                                    <div class="voice-circle {isVoiceMode ? (isVoiceProcessing ? 'processing' : 'spinning') : ''}"></div>
                                </div>
                            </button>
                        {/if}
                    </div>
                </div>
            {:else}
                <!-- Show only send button when MESSAGE_ICON is false (default) -->
                {#if hasText}
                    <button 
                        type="button"
                        class="send-button"
                        on:click={sendMessage}
                        title="Send message"
                    >
                        <i class="fas fa-paper-plane"></i>
                    </button>
                {/if}
            {/if}
            
            {#if study_group === 'chat'}
                <div class="vertical-divider"></div>
                <SubmitButton next={next} label="Proceed"/>
            {/if}
        </div>
    {/if}

    <TTSPlayer 
        bind:this={ttsRef} 
        enabled={ttsEnabled} 
        muted={ttsMuted} 
        instructions={instructions}
        on:ttsstart={() => { isTTSAudioPlaying = true; }}
        on:ttsend={() => { 
            // All TTS playback finished
            isTTSAudioPlaying = false;
            // If voice recognition was waiting for TTS and demographics gate is clear, resume
            if (isVoiceMode && isVoiceProcessing && !demographicsGatePending) {
                console.log('[TTS] Finished, resuming voice recognition');
                isVoiceProcessing = false;
                try { startVoiceRecognition(); } catch (e) { console.error('Resume after TTS error:', e); }
            }
        }}
    />
</div>


<style lang="postcss">
    .ttm {
        flex-flow: column wrap;
        background: var(--ttm-bg);
        min-height: 97vh;
        max-height: 97vh;
    }

    .notice {
        text-align: left;
        font-size: 0.8rem;
        padding-left: 13px;
        margin-bottom: 8px;
        color: var(--ttm-text-color);
    }

    .input-container {
        display: flex;
        justify-content: space-between;
        padding: 10px;
    }

    .input-wrapper {
        position: relative;
        flex-grow: 1;
    }

    .input-container input {
        width: 100%;
        margin-right: 10px;
    }

    .input-container button {
        @apply rounded-lg cursor-pointer px-8 py-2.5 border-2;
        margin-right: 10px;
    }

    /* Suggestions dropdown styling - positioned above the input field */
    .suggestions {
        list-style: none;
        margin: 0;
        padding: 0;
        border: 1px solid #ccc;
        border-bottom: none;
        background: #fff;
        position: absolute;
        bottom: calc(100% + 4px);
        left: 0;
        width: 100%;
        z-index: 10;
        max-height: 150px;
        overflow-y: auto;
    }

    .suggestion-item {
        display: block;
        width: 100%;
        padding: 4px 8px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.8rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }

    .suggestion-item:hover {
        background-color: #f0f0f0;
    }
    
    .suggestion-item:last-child {
        border-bottom: none;
    }

    /* Voice recognition section styling */
    .voice-recognition-section {
        display: flex;
        align-items: center;
        background-color: #f8f8f8;
        border-radius: 24px;
        padding: 5px 10px;
        margin: 0 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        border: 1px solid #e0e0e0;
    }

    .microphone-button, .send-button {
        width: 40px;
        height: 40px;
        border-radius: 50% !important;
        background-color: #f0f0f0;
        border: 1px solid #ddd !important;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 !important;
        margin: 0;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Voice wave container styling */
    .voice-wave-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-left: 8px;
        transition: all 0.3s ease;
    }

    .sound-wave-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        transition: transform 0.2s ease;
    }

    .sound-wave-button:hover {
        transform: scale(1.1);
    }

    .sound-wave-button:active {
        transform: scale(0.95);
    }
    
    .sound-wave-button.active {
        background-color: #e3f2fd;
        border: 2px solid #1976d2;
    }
    
    .voice-circle-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        min-width: 40px;
        min-height: 40px;
    }
    
    .voice-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(
            110deg,
            #063970 0%,
            #1e90ff 20%,
            #63a4ff 40%,
            #2ecc71 50%,
            #1e90ff 60%,
            #63a4ff 80%,
            #063970 100%
        );
        background-size: 300% 300%;
        position: relative;
        transition: all 0.3s ease;
        box-shadow: 
            inset -2px -2px 4px rgba(0, 0, 0, 0.6),
            inset 2px 2px 4px rgba(255, 255, 255, 0.4),
            0 0 5px rgba(0, 0, 0, 0.3),
            0 0 10px rgba(30, 144, 255, 0.2);
        /* Fallback solid color in case gradient doesn't work */
        background-color: #1976d2;
    }
    
    .voice-circle::before {
        content: '';
        position: absolute;
        top: -6px;
        left: -6px;
        width: 40px;
        height: 40px;
        border: 2px solid transparent;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    
    .voice-circle.spinning {
        animation: 
            rotate 6s linear infinite,
            moveGradient 3s ease infinite,
            float 3s ease-in-out infinite;
    }
    
    .voice-circle.spinning::before {
        border: 2px solid transparent;
        border-top: 2px solid #4caf50;
        border-right: 2px solid #4caf50;
        animation: spin-reverse 3s linear infinite;
    }
    
    .voice-circle.processing {
        animation: 
            pulse 1.5s ease-in-out infinite,
            moveGradient 2s ease infinite;
        opacity: 0.8;
    }
    
    .voice-circle.processing::before {
        border: 2px solid #ff9800;
        animation: pulse 1.5s ease-in-out infinite;
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
    
    @keyframes float {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-2px);
        }
        100% {
            transform: translateY(0);
        }
    }



    .voice-wave {
        display: flex;
        align-items: center;
        height: 20px;
        gap: 2px;
    }

    .wave-bar {
        display: inline-block;
        width: 3px;
        background-color: #1976d2;
        border-radius: 1px;
        animation: sound 0.5s 0s infinite alternate;
    }

    .wave-bar:nth-child(1) { height: 10px; animation-duration: 0.2s; }
    .wave-bar:nth-child(2) { height: 16px; animation-duration: 0.15s; }
    .wave-bar:nth-child(3) { height: 20px; animation-duration: 0.2s; }
    .wave-bar:nth-child(4) { height: 14px; animation-duration: 0.25s; }
    .wave-bar:nth-child(5) { height: 8px; animation-duration: 0.3s; }

    @keyframes sound {
        0% { height: 3px; }
        100% { height: 100%; }
    }
    
    .microphone-button:hover, .send-button:hover {
        background-color: #e8e8e8;
        box-shadow: 0 3px 6px rgba(0,0,0,0.15);
    }
    
    .microphone-button i, .send-button i {
        font-size: 18px;
        color: #555;
    }
    
    .send-button {
        background-color: #e3f2fd;
        border-color: #90caf9 !important;
    }
    
    .send-button:hover {
        background-color: #bbdefb;
    }
    
    .send-button i {
        color: #1976d2;
    }
    
    .microphone-button.recording {
        background-color: #ffeeee;
        border-color: #ff4d4d !important;
        animation: pulse 1.5s infinite;
    }
    
    .microphone-button.recording i {
        color: #f44336;
    }
    
    .microphone-button.processing {
        background-color: #f5f5f5;
        opacity: 0.8;
        cursor: not-allowed;
    }
    
    .loading-circle {
        width: 18px;
        height: 18px;
        border: 2px solid #ccc;
        border-top-color: #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .vertical-divider {
        width: 2px;
        height: 45px; /* Adjust the height as needed */
        background-color: #ccc; /* Adjust the color as needed */
        margin: 0 20px; /* Adjust the margin as needed */
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 1;
        }
        50% {
            transform: scale(1.2);
            opacity: 0.7;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
    }
    .tts-controls {
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    .tts-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .tts-label { font-size: 12px; color: #555; }
    
    .mute-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        color: #555;
        font-size: 14px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
    }
    
    .mute-button:not(.disabled):hover {
        background-color: #f0f0f0;
        color: #333;
    }
    
    .mute-button:not(.disabled):active {
        transform: scale(0.95);
    }
    
    .mute-button.disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .mute-button:disabled {
        pointer-events: none;
    }
    .switch { position: relative; display: inline-block; width: 42px; height: 22px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .2s; border-radius: 34px; }
    .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: white; transition: .2s; border-radius: 50%; }
    input:checked + .slider { background-color: #4caf50; }
    input:checked + .slider:before { transform: translateX(20px); }
    
    /* Muted state styling */
    .mute-button i.fa-volume-mute {
        color: #ff5722;
    }
    
    .mute-button i.fa-volume-up {
        color: #4caf50;
    }
</style>
