<script lang="ts">
    import type {TChatMessage} from '$lib/types';
    import {afterUpdate, beforeUpdate} from 'svelte';
    import Header from './Header.svelte';
    import Message from './Message.svelte';
    import ProgressMessage from './ProgressMessage.svelte';
    import {createEventDispatcher} from 'svelte';
    import SubmitButton from "$lib/components/SubmitButton.svelte";

    export let messages: TChatMessage[] = [];
    let element: HTMLElement;
    let inputMessage = '';
    export let user_input = true;
    export let study_group = '';

    // Autocomplete suggestions for the chat input with substituted attributes
    let suggestions = [
        "Explain this prediction to me",
        "Why under 50k?",
        "Why over 50k?",
        "Why do you think so?",
        "What factors matter the most in how the model makes its decision?",
        "Which features play the strongest role in influencing the model's prediction?",
        "What factors have very little effect on the model’s decision?",
        "Which features contribute the least to the model's prediction?",
        "How much does each feature influence the prediction for this person?",
        "How strong is the effect of each factor on this person’s outcome?",
        "What features would have to change to get a different prediction?",
        "Which factors must be altered for the model to predict something else?",
        "What set of features matters the most for this individual’s prediction?",
        "Which collection of factors is most crucial for this person's result?",
        "How sure is the model about its prediction for this individual?",
        "What level of certainty does the model have regarding this person's prediction?",
        "Would the model's prediction change if just the Occupation were different?",
        "If we only alter the Occupation, does the prediction for this person shift?",
        "In general, how does someone's Occupation relate to the model's prediction?",
        "What is the typical relationship between Occupation and the model’s decision?",
        "What is the spread of Age values across the dataset?",
        "How do the various Age values compare throughout the dataset?"
    ];

    // Filter suggestions based on the input text
    $: filteredSuggestions = inputMessage.trim()
        ? suggestions.filter(s => s.toLowerCase().includes(inputMessage.toLowerCase()))
        : [];

    let autoscroll = false;
    const dispatch = createEventDispatcher();

    function forwardFeedback(event) {
        dispatch('feedbackButtonClick', event.detail);
    }

    function forwardQuestionClick(event) {
        dispatch('questionClick', event.detail);
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
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
        dispatch('next');
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

    function selectSuggestion(suggestion: string) {
        inputMessage = suggestion;
        sendMessage();
    }
</script>

<div class="ttm flex h-full">
    <Header>Chatbot</Header>
    <main bind:this={element} class="flex-1 overflow-y-auto h-full p-3">
        {#each messages as message}
            <Message {message} on:feedbackButtonClick={forwardFeedback} on:questionClick={forwardQuestionClick}/>
        {/each}

        {#if messages.length && messages[messages.length - 1].isUser}
            <ProgressMessage/>
        {/if}
    </main>

    {#if user_input}
        <!-- Left-aligned notice above the chat field -->
        <div class="notice">
            <p><b>Do Not Provide Personal Information</b>: Your messages go to OpenAI. Don't share personal data.</p>
        </div>

        <div class="input-area">
            <div class="input-wrapper">
                {#if filteredSuggestions.length > 0}
                    <ul class="suggestions">
                        {#each filteredSuggestions as suggestion}
                            <li on:click={() => selectSuggestion(suggestion)}>{@html suggestion}</li>
                        {/each}
                    </ul>
                {/if}
                <input
                        class="variant-ghost-surface"
                        bind:value={inputMessage}
                        type="text"
                        placeholder="Start typing to get question suggestion or ask your own question..."
                        on:keydown={handleKeydown}/>
            </div>
            <button class="variant-ghost-primary" on:click={sendMessage}>Send</button>
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

    .notice {
        text-align: left;
        font-size: 0.8rem;
        padding-left: 13px;
        margin-bottom: 8px;
        color: var(--ttm-text-color);
    }

    .input-area {
        display: flex;
        justify-content: space-between;
        padding: 10px;
        position: relative;
    }

    .input-wrapper {
        position: relative;
        flex-grow: 1;
    }

    .input-area input {
        width: 100%;
        margin-right: 10px;
        margin-top: 3px;
    }

    .input-area button {
        @apply rounded-lg cursor-pointer px-8 py-2.5 border-2;
        margin-right: 10px;
    }

    .vertical-divider {
        width: 2px;
        height: 45px;
        background-color: #ccc;
        margin: 0 20px;
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
</style>