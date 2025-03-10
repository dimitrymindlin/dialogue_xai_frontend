<script lang="ts">
    import type {TChatMessage} from '$lib/types';
    import {afterUpdate, beforeUpdate} from 'svelte';
    import Header from './Header.svelte';
    import Message from './Message.svelte';
    import ProgressMessage from './ProgressMessage.svelte'; // Import our new component
    import {createEventDispatcher} from 'svelte';
    import SubmitButton from "$lib/components/SubmitButton.svelte";

    export let messages: TChatMessage[] = [];
    let element: HTMLElement;
    let inputMessage = '';
    export let user_input = true;
    export let study_group = '';
    export let user_id = '';
    let isRecording = false;
    let audioRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let isProcessingSpeech = false;
    let hasText = false; // New variable to track if there's text in the input

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
        dispatch('submit', {message: inputMessage});
        inputMessage = '';
    }

    async function next(e: any) {
        e.preventDefault();
        dispatch('next', null);
    }

    // Speech recognition functions
    async function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
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

        <!-- Conditionally render the progress message if the last message is from the user -->
        {#if messages.length && messages[messages.length - 1].isUser}
            <ProgressMessage/>
        {/if}
    </main>

    {#if user_input}
        <div class="input-container">
            <input
                type="text"
                bind:value={inputMessage}
                placeholder="Type your message..."
                on:keydown={handleKeydown}
            />
            
            <!-- Show send button when there's text, otherwise show microphone button -->
            {#if hasText}
                <button 
                    type="button"
                    class="send-button"
                    on:click={sendMessage}
                    title="Send message"
                >
                    <i class="fas fa-paper-plane"></i>
                </button>
            {:else}
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
            {/if}
            
            {#if study_group === 'chat'}
                <div class="vertical-divider"></div>
                <SubmitButton next={next} label="Proceed"/>
            {/if}
        </div>
    {/if}
</div>


<style lang="postcss">
    .ttm {
        flex-flow: column wrap;
        background: var(--ttm-bg);
        min-height: 97vh;
        max-height: 97vh;
    }

    .input-container {
        display: flex;
        justify-content: space-between;
        padding: 10px;
    }

    .input-container input {
        flex-grow: 1;
        margin-right: 10px;
    }

    .input-container button {
        @apply rounded-lg cursor-pointer px-8 py-2.5 border-2;
        margin-right: 10px;
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
        margin: 0 10px;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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

    .speech-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        padding: 0;
        background-color: white;
    }

    .mic-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #333;
    }

    .recording-indicator {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #ff4b4b;
        animation: pulse 1.5s infinite;
    }

    .processing-indicator {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: #333;
        animation: spin 1s linear infinite;
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

    .recording {
        background-color: #ffeeee;
    }

    .processing {
        background-color: #eeeeee;
        cursor: not-allowed;
    }

    .vertical-divider {
        width: 2px;
        height: 45px; /* Adjust the height as needed */
        background-color: #ccc; /* Adjust the color as needed */
        margin: 0 20px; /* Adjust the margin as needed */
    }
</style>
