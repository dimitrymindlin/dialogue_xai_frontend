<script lang="ts">
    import LikeButton from './LikeButton.svelte';
    import DislikeButton from './DislikeButton.svelte';
    import {createEventDispatcher} from 'svelte';
    import type {TChatMessage} from '$lib/types';
    import {fade} from 'svelte/transition';

    export let message: TChatMessage;

    const dispatch = createEventDispatcher();

    let isClicked = false;

    // Function to forward event
    function forwardEvent(event) {
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
</script>

<!-- Original Message Display -->
<div class="flex items-end mb-2.5 {message.isUser ? 'right-msg' : 'left-msg'}">
    <div class="msg-bubble max-w-md p-2.5 rounded-2xl" on:click={toggleMessageSize}>
        {@html message.text}
        {#if !message.isUser && message.feedback}
            <br/>
            <span class="float-right flex flex-wrap" on:click|stopPropagation in:fade={{ delay: 1000, duration: 250 }}>
            <span class="text-sm text-gray-600 mt-2 mr-1">Liking the response?</span>
            <LikeButton {message} on:feedbackButtonClick={forwardEvent}/>
            <DislikeButton {message} on:feedbackButtonClick={forwardEvent}/>
          </span>
        {/if}
        <br/>
        {#if message.followup && message.followup.length > 0}
            <div class="follow-up-questions">
                <p><b>Clarification Question</b></p>
                {#each message.followup as question}
                    <button
                            data-value={question.id}
                            type="button"
                            class="btn variant-ghost-primary"
                            style="font-size: 0.75rem;"
                            on:click|stopPropagation={() => buttonOnClick(question.question_id, question.feature_id, question.question)}
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
                                    data-value={question.id}
                                    type="button"
                                    class="btn variant-ghost-primary"
                                    style="font-size: 0.75rem;"
                                    on:click={() => buttonOnClick(question.id, question.feature)}
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

    /* Optional: Prevent scrolling when modal is open */
    body.modal-open {
        overflow: hidden;
    }
</style>
