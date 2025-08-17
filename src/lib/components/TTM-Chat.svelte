<script lang="ts">
    import type {TChatMessage} from '$lib/types';
    import {afterUpdate, beforeUpdate} from 'svelte';
    import Header from './Header.svelte';
    import Message from './Message.svelte';
    import ProgressMessage from './ProgressMessage.svelte'; // Import our new component
    import {createEventDispatcher} from 'svelte';
    import SubmitButton from "$lib/components/SubmitButton.svelte";
    import SoundWaveOverlay from "./SoundWaveOverlay.svelte"; // Import the new overlay component
    import backend from '$lib/backend'; // Add backend import
    import {getDatasetConfig} from '$lib/dataset-configs';
    import {env} from '$env/dynamic/public';

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

    // Get dataset-specific configuration including chat suggestions
    $: datasetConfig = getDatasetConfig(dataset);
    $: chatSuggestions = datasetConfig.chatSuggestions;

    // Filter suggestions based on the input text
    $: filteredSuggestions = inputMessage.trim()
        ? chatSuggestions.filter(s => s.toLowerCase().includes(inputMessage.toLowerCase()))
        : [];

    let autoscroll = false;

    const dispatch = createEventDispatcher();

    // Watch for changes in inputMessage to toggle hasText
    $: hasText = inputMessage.trim().length > 0;

    function forwardFeedback(event: CustomEvent) {
        dispatch('feedbackButtonClick', event.detail);
    }

     function forwardQuestionClick(event: CustomEvent) {
        dispatch('questionClick', event.detail);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Stop the form from submitting
            sendMessage();
        }
    }

    function sendMessage() {
        if (inputMessage.trim() === '') return;

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
            }).catch(error => {
                handleResponseStart(); // Also handle on error
                console.error('Stream error:', error);

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
                    
                    // Dispatch event for logging purposes (if parent needs it)
                    dispatch('streamComplete', {
                        message: userInput,
                        response: aiMessage
                    });
                })
                .catch(error => {
                    handleResponseStart();
                    console.error('Non-streaming API error:', error);

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

    // Function for the sound wave button
    function handleSoundWaveClick() {
        console.log('Sound wave button clicked');
        showSoundWaveOverlay = true; // Show the overlay when button is clicked
    }

    // Function to close the overlay
    function handleCloseOverlay() {
        showSoundWaveOverlay = false;
    }

    // Function to save sound settings
    function handleSaveSettings() {
        console.log('Saving sound settings');
        // Here you would implement the logic to save the settings
        showSoundWaveOverlay = false;
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
                    const apiUrl = 'http://localhost:5000/speech-to-text';
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
</script>

<svelte:head>
    <!-- Add Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</svelte:head>

<div class="ttm flex h-full">
    <Header>Chatbot</Header>
    <main bind:this={element} class="flex-1 overflow-y-auto h-full p-3">
        {#each messages as message}
            <Message {message} on:feedbackButtonClick={forwardFeedback} on:questionClick={forwardQuestionClick}/>
        {/each}

        <!-- Show progress message if we are waiting for a response from the backend -->
        {#if isWaitingForResponse}
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
                            <li on:click={() => selectSuggestion(suggestion)}>{suggestion}</li>
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
                                class="sound-wave-button"
                                on:click={handleSoundWaveClick}
                                title="Sound options"
                            >
                                <div class="sound-wave-icon">
                                    <span class="sound-wave-line"></span>
                                    <span class="sound-wave-line"></span>
                                    <span class="sound-wave-line"></span>
                                    <span class="sound-wave-line"></span>
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

    <!-- Sound Wave Overlay -->
    {#if showSoundWaveOverlay}
        <SoundWaveOverlay 
            on:close={handleCloseOverlay}
            on:save={handleSaveSettings}
        />
    {/if}
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

    .suggestions li {
        padding: 4px 8px;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .suggestions li:hover {
        background-color: #f0f0f0;
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

    .sound-wave-icon {
        display: flex;
        align-items: center;
        height: 20px;
        gap: 3px;
    }

    .sound-wave-line {
        display: inline-block;
        width: 2px;
        background-color: #555;
        border-radius: 1px;
    }

    .sound-wave-line:nth-child(1) { height: 6px; }
    .sound-wave-line:nth-child(2) { height: 10px; }
    .sound-wave-line:nth-child(3) { height: 10px; }
    .sound-wave-line:nth-child(4) { height: 6px; }

    .voice-wave-container i {
        color: #555;
        font-size: 18px;
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
</style>
