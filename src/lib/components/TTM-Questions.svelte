<script lang="ts">
    import type {TFeatureName, TFeatureQuestion, TGeneralQuestion} from '$lib/types';
    import Header from './Header.svelte';
    import {createEventDispatcher} from 'svelte';
    import QuestionButton from '$lib/components/QuestionButton.svelte';
    import '$lib/../global.css';

    const dispatch = createEventDispatcher();

    export let general_questions: TGeneralQuestion[];
    export let feature_questions: TFeatureQuestion[];
    export let current_prediction: string;
    export let feature_questions_dropdown: TFeatureName[];

    let activeQuestion: string;
    let activeFeature = "";

    // Delete KGS22 from feature_questions_dropdown
    feature_questions_dropdown = feature_questions_dropdown.filter(f => f.feature_name !== 'Wohnquartier ID');

    // Replace the placeholder in the questions with the actual value
    // Do this for both general_questions and feature_questions
    $: general_questions = general_questions.map(q => ({
        ...q,
        question: q.question.replace('[current prediction]', current_prediction)
    }));
    $: feature_questions = feature_questions.map(q => ({
        ...q,
        question: q.question.replace('[current prediction]', current_prediction)
    }));

    async function next(e: any) {
        e.preventDefault();
        dispatch('next', null);
    }

    // Handle actions from QuestionButton
    function handleAction(event) {
        const {type, questionId, question, feature} = event.detail;

        if (type === 'feature') {
            // Update activeFeature for feature questions
            activeFeature = feature;
        }

        activeQuestion = questionId;

        // Common submission logic can go here, if applicable
        dispatch('submit', {questionId, question, feature});
    }
</script>

<div class="inputarea max-w-[500px] shadow-[0_15px_15px_-5px_rgba(0,0,0,0.2)] text-center mx-2.5 my-0">
    <form class="grid">
        <div class="row-[1]">
            <Header>
                <p>Generelle Fragen</p>
            </Header>
            <div class="mx-1.5">
                {#each general_questions as question}
                    <QuestionButton type="general" question={question.question} questionId={question.q_id}
                                    on:action={handleAction} isActive={activeQuestion === question.q_id}/>
                {/each}
            </div>
        </div>

        <div class="row-[2]">
            <Header>
                <p>Attributbezogene Fragen</p>
            </Header>
            <div class="mx-1.5">
                {#each feature_questions as question}
                    <QuestionButton type="feature" question={question.question} questionId={question.q_id}
                                    featureOptions={feature_questions_dropdown} on:action={handleAction}
                                    isActive={activeQuestion === question.q_id}/>
                {/each}
            </div>
        </div>
    </form>
</div>

<style lang="postcss">
    .inputarea {
        background: var(--questions-bg);
        min-height: 97vh;
        position: relative;
    }

    /* Style the buttons to appear below each other */
    .inputarea button {
        @apply rounded-lg w-[90%] whitespace-normal my-[5px] px-2 py-3.5 text-sm;
    }

    /* Style the selection field like tailwind */
    select {
        @apply rounded-lg bg-[whitesmoke] cursor-pointer mx-0 my-[5px] px-5 py-3.5 border-2;
    }

    input[type='submit'] {
        @apply bg-[black] text-[white] rounded-lg cursor-pointer mx-0 my-[5px] px-5 py-3.5 border-[none];
        position: absolute;
        bottom: 0;
        left: 15%;
    }
</style>



