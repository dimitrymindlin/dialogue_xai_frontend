<script lang="ts">
    import type {TChatMessage} from '$lib/types';
    import {afterUpdate, beforeUpdate} from 'svelte';
    import Header from './Header.svelte';
    import Message from './Message.svelte';
    import {createEventDispatcher} from 'svelte';
    import SubmitButton from "$lib/components/SubmitButton.svelte";

    export let messages: TChatMessage[] = [];
    let element: HTMLElement;
    let inputMessage = '';
    export let user_input = true;
    export let study_group = '';
    export let awaitingResponse = false;

    let autoscroll = false;

    const dispatch = createEventDispatcher();

    function forwardEvent(event) {
        dispatch('feedbackButtonClick', event.detail);
    }

    function forwardQuestionClick(event) {
        dispatch('questionClick', event.detail);
    }

    function handleKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Stop the form from submitting
            sendMessage();
        }
    }

    function sendMessage() {
        if (inputMessage.trim() === '') {
            return;
        }
        dispatch('submit', {message: inputMessage});
        inputMessage = '';
    }

    async function next(e: any) {
        e.preventDefault();
        dispatch('next', null);
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

<div
        class="ttm flex h-full"
>
    <Header>Chat</Header>
    <main

            bind:this={element}
            class="flex-1 overflow-y-auto h-full p-3"
    >
        {#if awaitingResponse}
            <div class="processing-message">
                <span class="spinner"></span>
                <p>Generating response...</p>
            </div>
        {/if}
        {#each messages as message}
            <Message {message} on:feedbackButtonClick={forwardEvent} on:questionClick={forwardQuestionClick}/>
        {/each}
    </main>
</div>


<style lang="postcss">
    .processing-message {
        background: #f7f7f7;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #ccc;
        border-top-color: #333;
        border-radius: 50%;
        margin-right: 0.5rem;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .ttm {
        flex-flow: column wrap;
        background: var(--ttm-bg);
        min-height: 97vh;
        max-height: 97vh;
    }

    .input-area {
        display: flex;
        justify-content: space-between;
        padding: 10px;
    }

    .input-area input {
        flex-grow: 1;
        margin-right: 10px;
    }

    .input-area button {
        @apply rounded-lg cursor-pointer px-8 py-2.5 border-2;
        margin-right: 10px;
    }

    .vertical-divider {
        width: 2px;
        height: 45px; /* Adjust the height as needed */
        background-color: #ccc; /* Adjust the color as needed */
        margin: 0 20px; /* Adjust the margin as needed */
    }
</style>
