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
</script>

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
        <div class="input-area">
            <input class="variant-ghost-surface" bind:value={inputMessage} type="text" placeholder="Ask a question..."
                   on:keydown={handleKeydown}/>
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
