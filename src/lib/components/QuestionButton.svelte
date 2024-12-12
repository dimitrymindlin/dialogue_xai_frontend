<!-- QuestionButton.svelte -->
<script lang="ts">
    import {createEventDispatcher} from 'svelte';

    export let type: 'general' | 'feature';
    export let question: string;
    export let questionId: string;
    export let featureOptions: { id: number; feature_name: string }[] = [];

    let activeFeature = '';
    export let isActive: boolean;

    const dispatch = createEventDispatcher();

    // Handles button clicks for both general and feature questions
    function handleClick() {
        // Get correct feature name from feature_id in activeFeature
        let feature_name = featureOptions.find(f => f.id === Number(activeFeature))?.feature_name ?? '';
        // For feature questions, ensure a feature is selected
        if (type === 'feature' && !feature_name) {
            console.log('Feature question requires a feature to be selected');
            return;
        }

        // Dispatch an event to signify the button click, including question type, question, and feature info if applicable
        dispatch('action', {
            type,
            questionId,
            question: question.replace('[feature selection]', feature_name),
            feature: activeFeature,
        });
    }

    function submitQuestion() {
        // Get correct feature name from feature_id in activeFeature
        let feature_name = featureOptions.find(f => f.id === Number(activeFeature))?.feature_name ?? '';
        // Dispatch includes the question type to allow for differentiated handling
        dispatch('action', {
            type,
            questionId,
            question: question.replace('[feature selection]', feature_name),
            feature: activeFeature,
        });
    }

    function handleChange(event) {
        activeFeature = event.target.value;
        // Proceed to submit the question automatically if a valid feature is selected
        if (type === 'feature' && activeFeature !== '') {
            submitQuestion();
        }
    }

</script>

<button
        on:click={handleClick}
        class:variant-filled-primary={isActive} class:variant-ghost-primary={!isActive}
        data-value={questionId}
        type="button"
        style="font-size: 0.75rem;">
    {#if type === 'feature'}
        {@html question.split('[feature selection]')[0]}
        <select bind:value={activeFeature} on:change={handleChange} class="select-dropdown">
            <option value="" disabled>Select Attribute</option>
            {#each featureOptions as feature}
                <option value="{feature.id.toString()}">{feature.feature_name}</option>
            {/each}
        </select>
        {@html question.split('[feature selection]')[1]}
    {:else}
        {@html question}
    {/if}
</button>

<style lang="postcss">
    /* Style the buttons to adapt to container width */
    button {
        @apply rounded-lg w-full whitespace-normal my-[5px] px-2 py-3.5 text-sm;
        max-width: 100%; /* Ensure it doesn't overflow its container */
    }

</style>
