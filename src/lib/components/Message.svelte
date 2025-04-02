<script lang="ts">
    import LikeButton from './LikeButton.svelte';
    import DislikeButton from './DislikeButton.svelte';
    import {createEventDispatcher, onMount} from 'svelte';
    import type {TChatMessage} from '$lib/types';
    import {fade} from 'svelte/transition';

    export let message: TChatMessage;

    const dispatch = createEventDispatcher();

    let isClicked = false;
    let displayedText = ''; // Text to be displayed with animation
    let fullText = ''; // Store the full text
    let isTyping = false; // Flag to indicate if the typing animation is ongoing
    let currentIndex = 0; // Current index for typing animation
    let typingSpeed = 20; // Milliseconds per character (adjust for faster/slower)
    let typingInterval: ReturnType<typeof setInterval>; // Interval for typing animation

    // Parse and clean HTML content for animation
    function parseHTML(html: string): string {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    // Handle HTML rendering safely with word-by-word animation
    function renderHTML(text: string, isComplete: boolean): string {
        if (isComplete) {
            // Return original HTML when animation completes
            return message.text;
        }
        
        // Process text for display
        const safeText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\s\s/g, '&nbsp;&nbsp;');
        
        // Split into words and characters for better animation
        const words = safeText.split(' ');
        let result = '';
        
        if (words.length > 0) {
            // For all words except the last one
            for (let i = 0; i < words.length - 1; i++) {
                result += `<span class="word">${words[i]}</span> `;
            }
            
            // Handle the last word with special animation
            const lastWord = words[words.length - 1];
            
            // For the last word, add character-by-character fade
            if (lastWord.length > 0) {
                const chars = lastWord.split('');
                let lastWordHtml = '';
                
                // Apply different fade classes to last few characters
                for (let i = 0; i < chars.length; i++) {
                    const char = chars[i];
                    
                    if (i >= chars.length - 3) {
                        // Last 3 characters get stronger fade effect
                        const fadeClass = i === chars.length - 1 ? 'char-fade-strong' : 
                                         i === chars.length - 2 ? 'char-fade-medium' : 'char-fade-light';
                        lastWordHtml += `<span class="${fadeClass}">${char}</span>`;
                    } else {
                        lastWordHtml += char;
                    }
                }
                
                result += `<span class="word word-last">${lastWordHtml}</span>`;
            }
        }
        
        return result || safeText;
    }

    // Start the typing animation with optimized timing
    function startTypingAnimation() {
        if (message.isUser) return; // Only animate AI responses
        
        isTyping = true;
        currentIndex = 0;
        displayedText = '';
        
        // Get raw text without HTML tags for animation
        fullText = parseHTML(message.text);
        
        // Clear any existing interval
        if (typingInterval) clearInterval(typingInterval);
        
        // Adjust typing speed based on message length - slower speeds for better visibility
        let baseSpeed: number;
        const textLength = fullText.length;
        
        if (textLength > 800) baseSpeed = 25;
        else if (textLength > 500) baseSpeed = 30;
        else if (textLength > 300) baseSpeed = 35;
        else if (textLength > 100) baseSpeed = 40;
        else baseSpeed = 45;
        
        typingSpeed = baseSpeed;
        
        // Start typing animation with a delay for smoother appearance
        setTimeout(() => {
            let wordBoundary = false; // Track if we're at a word boundary for better animation
            
            typingInterval = setInterval(() => {
                if (currentIndex < fullText.length) {
                    // Check if we're at a word boundary (space or punctuation)
                    const currentChar = fullText[currentIndex];
                    const isSpace = /\s/.test(currentChar);
                    const isPunctuation = /[.,!?;:]/.test(currentChar);
                    
                    // Add the character to displayed text
                    displayedText += currentChar;
                    currentIndex++;
                    
                    // Set word boundary flag for next iteration
                    wordBoundary = isSpace || isPunctuation;
                    
                    // Adjust typing speed based on character type
                    if (isPunctuation) {
                        if (/[.!?]/.test(currentChar)) {
                            // End of sentence - longer pause
                            typingSpeed = baseSpeed * 3.2;
                        } else {
                            // Other punctuation - medium pause
                            typingSpeed = baseSpeed * 2;
                        }
                    } else if (isSpace) {
                        // Space between words - slight pause
                        typingSpeed = baseSpeed * 1.5;
                    } else if (wordBoundary && !isSpace && !isPunctuation) {
                        // First character of a new word - slightly slower for effect
                        typingSpeed = baseSpeed * 1.2;
                        wordBoundary = false;
                    } else {
                        // Regular characters within words - randomize slightly for natural feel
                        const randomFactor = Math.random() * 0.2 + 0.9; // Between 0.9 and 1.1
                        typingSpeed = Math.floor(baseSpeed * randomFactor);
                    }
                    
                    // For very long messages, gradually speed up as we go
                    if (textLength > 300 && currentIndex > 100) {
                        // After first 100 chars, start speeding up slightly
                        const progressFactor = Math.min(0.7, (currentIndex - 100) / textLength);
                        typingSpeed = Math.max(baseSpeed * 0.6, typingSpeed * (1 - progressFactor));
                    }
                } else {
                    // Animation complete
                    isTyping = false;
                    clearInterval(typingInterval);
                    // Show the original HTML content after animation
                    displayedText = message.text;
                }
            }, typingSpeed);
        }, 500); // Longer initial delay for smoother appearance
    }

    // Function to skip animation and show full text
    function skipAnimation() {
        if (!isTyping) return;
        
        clearInterval(typingInterval);
        isTyping = false;
        displayedText = message.text;
    }

    // Start animation when component is mounted
    onMount(() => {
        if (!message.isUser) {
            startTypingAnimation();
        } else {
            // For user messages, just display the full text
            displayedText = message.text;
        }

        // Clean up interval on component destroy
        return () => {
            if (typingInterval) clearInterval(typingInterval);
        };
    });

    // Function to forward event
    function forwardEvent(event: any) {
        dispatch('feedbackButtonClick', event.detail);
    }

    // Function to handle button click for questions
    function buttonOnClick(questionId: string, feature: string, question: string) {
        dispatch('questionClick', {questionId, feature, question});
    }

    // Function to toggle message size
    function toggleMessageSize() {
        if (!message.isUser) {
            isClicked = true;
        }
    }

    // Function to close the modal
    function closeModal() {
        isClicked = false;
    }

    // Dynamically adjust typingSpeed based on message length
    $: {
        if (message && !message.isUser && message.text) {
            const textLength = parseHTML(message.text).length;
            // Slightly faster for longer messages
            if (textLength > 500) typingSpeed = 10;
            else if (textLength > 200) typingSpeed = 15;
            else typingSpeed = 20;
        }
    }
</script>

<!-- Original Message Display -->
<div class="flex items-end mb-2.5 {message.isUser ? 'right-msg' : 'left-msg'}">
    <div class="msg-bubble max-w-md p-2.5 rounded-2xl" on:click={toggleMessageSize}>
        {#if message.isUser}
            {@html message.text}
        {:else}
            <!-- Animate only AI responses -->
            <div class="animated-text">
                {#if isTyping}
                    {@html renderHTML(displayedText, false)}
                    <span class="typing-cursor">|</span>
                    <div class="skip-animation" on:click|stopPropagation={skipAnimation}>
                        <button class="skip-button">Skip</button>
                    </div>
                {:else}
                    {@html message.text}
                {/if}
            </div>
        {/if}
        
        {#if !message.isUser && message.feedback && !isTyping}
            <br/>
            <span class="float-right flex flex-wrap" on:click|stopPropagation in:fade={{ delay: 1000, duration: 250 }}>
            <span class="text-sm text-gray-600 mt-2 mr-1">Liking the response?</span>
            <LikeButton {message} on:feedbackButtonClick={forwardEvent}/>
            <DislikeButton {message} on:feedbackButtonClick={forwardEvent}/>
          </span>
        {/if}
        <br/>
        {#if message.followup && message.followup.length > 0 && !isTyping}
            <div class="follow-up-questions">
                <p><b>Clarification Question</b></p>
                {#each message.followup as question}
                    <button
                            data-value={question.question_id}
                            type="button"
                            class="btn variant-ghost-primary"
                            style="font-size: 0.75rem;"
                            on:click|stopPropagation={() => buttonOnClick(question.question_id, 'feature_id' in question ? question.feature_id.toString() : '', question.question)}
                    >
                        {question.question}
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Modal Overlay -->
{#if isClicked}
    <div class="modal-overlay" on:click={closeModal} in:fade>
        <div class="modal-content" on:click|stopPropagation>
            <div class="msg-bubble enlarged p-4">
                {@html message.text}
                {#if !message.isUser && message.feedback}
                    <br/>
                    <span class="float-right flex flex-wrap" in:fade={{ delay: 500, duration: 250 }}>
                        <LikeButton {message} on:feedbackButtonClick={forwardEvent}/>
                        <DislikeButton {message} on:feedbackButtonClick={forwardEvent}/>
                    </span>
                {/if}
                <br/>
                {#if message.followup && message.followup.length > 0}
                    <div class="follow-up-questions">
                        <p><b>Question Suggestions</b></p>
                        {#each message.followup as question}
                            <button
                                    data-value={question.question_id}
                                    type="button"
                                    class="btn variant-ghost-primary"
                                    style="font-size: 0.75rem;"
                                    on:click={() => buttonOnClick(question.question_id, 'feature_id' in question ? question.feature_id.toString() : '', question.question)}
                            >
                                {question.question}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .left-msg .msg-bubble {
        @apply rounded-bl-none variant-ghost-surface;
    }

    .right-msg {
        @apply flex-row-reverse;
    }

    .right-msg .msg-bubble {
        @apply rounded-br-none variant-ghost-tertiary;
    }

    .follow-up-questions p {
        @apply font-semibold;
    }

    .msg-bubble .btn, .btn {
        @apply m-1 p-2 bg-transparent border border-solid border-gray-300 rounded cursor-pointer text-left block w-full;
        white-space: normal; /* Ensure text wraps */
        overflow: hidden; /* Keep the content within the button */
        max-width: 100%;
        transition: background-color 0.3s ease;

        &:hover {
            @apply bg-gray-200;
        }
    }

    /* Styles for the enlarged message in the modal */
    .msg-bubble.enlarged {
        max-width: 80vw; /* Adjust as needed */
        background-color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    /* Modal Overlay Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000; /* Ensure it sits above other elements */
    }

    .modal-content {
        /* Optional: Add any additional styling if needed */
    }

    /* Animation styles */
    .animated-text {
        position: relative;
        min-height: 1.2em;
        line-height: 1.6;
        letter-spacing: 0.015em;
        word-spacing: 0.06em;
        color: rgba(0, 0, 0, 0.9);
        will-change: opacity, transform;
        transition: all 0.25s ease-in-out;
    }

    .animated-text p {
        margin-bottom: 0.9em;
    }
    
    /* Character and word fading effects */
    .word {
        display: inline-block;
        opacity: 0.97;
        will-change: opacity, transform;
        transition: opacity 0.4s ease-out, transform 0.3s ease-out;
    }
    
    .word-last {
        animation: wordFadeIn 0.8s ease-out;
        will-change: opacity, transform, filter;
    }
    
    .char-fade-strong {
        display: inline-block;
        animation: charFadeInStrong 1s ease-out;
        will-change: opacity, transform, filter;
    }
    
    .char-fade-medium {
        display: inline-block;
        animation: charFadeInMedium 0.9s ease-out;
        will-change: opacity, transform, filter;
    }
    
    .char-fade-light {
        display: inline-block;
        animation: charFadeInLight 0.8s ease-out;
        will-change: opacity, transform, filter;
    }
    
    @keyframes wordFadeIn {
        0% { opacity: 0.2; transform: translateY(3px); filter: blur(0.7px); }
        40% { opacity: 0.5; transform: translateY(2px); filter: blur(0.4px); }
        70% { opacity: 0.7; transform: translateY(1px); filter: blur(0.2px); }
        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    
    @keyframes charFadeInStrong {
        0% { opacity: 0; transform: translateY(4px); filter: blur(1.2px); }
        30% { opacity: 0.2; transform: translateY(3px); filter: blur(0.8px); }
        50% { opacity: 0.4; transform: translateY(2px); filter: blur(0.5px); }
        70% { opacity: 0.7; transform: translateY(1px); filter: blur(0.3px); }
        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    
    @keyframes charFadeInMedium {
        0% { opacity: 0.1; transform: translateY(3px); filter: blur(0.9px); }
        40% { opacity: 0.4; transform: translateY(2px); filter: blur(0.5px); }
        70% { opacity: 0.7; transform: translateY(1px); filter: blur(0.2px); }
        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    
    @keyframes charFadeInLight {
        0% { opacity: 0.2; transform: translateY(2px); filter: blur(0.6px); }
        50% { opacity: 0.6; transform: translateY(1px); filter: blur(0.3px); }
        80% { opacity: 0.8; filter: blur(0.1px); }
        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
    }

    .typing-cursor {
        display: inline-block;
        margin-left: 2px;
        animation: blink 1.3s infinite;
        color: #333;
        opacity: 0.8;
        font-weight: 300;
        position: relative;
        top: -1px;
    }

    @keyframes blink {
        0%, 100% { opacity: 0.8; }
        40% { opacity: 0.15; }
        60% { opacity: 0.15; }
    }

    .skip-animation {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
        opacity: 0;
        animation: fadeIn 0.7s ease-out 1.8s forwards;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .skip-button {
        font-size: 12px;
        padding: 3px 10px;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 12px;
        cursor: pointer;
        color: #555;
        transition: all 0.4s ease;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .skip-button:hover {
        background-color: #e0e0e0;
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }

    /* Optional: Prevent scrolling when modal is open */
    body.modal-open {
        overflow: hidden;
    }
</style>
