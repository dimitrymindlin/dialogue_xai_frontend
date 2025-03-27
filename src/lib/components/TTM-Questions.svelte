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

<div class="inputarea max-w-[500px] shadow-[0_15px_15px_-5px_rgba(0,0,0,0.2)] text-center mx-2.5 my-0 flex flex-col">
  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto">
    <form class="grid">
      <div class="row-[1]">
        <Header>
          <p>Questions</p>
        </Header>
        <div class="mx-1.5">
          {#each general_questions as question}
            <QuestionButton
              type="general"
              question={question.question}
              questionId={question.q_id}
              on:action={handleAction}
              isActive={activeQuestion === question.q_id}
            />
          {/each}
          {#each feature_questions as question}
            <QuestionButton
              type="feature"
              question={question.question}
              questionId={question.q_id}
              featureOptions={feature_questions_dropdown}
              on:action={handleAction}
              isActive={activeQuestion === question.q_id}
            />
          {/each}
        </div>
      </div>
    </form>
  </div>

  <!-- Fixed footer -->
  <div class="py-2">
    <input
      type="submit"
      value="Proceed"
      style="width: 70%;"
      on:click|preventDefault={next}
    />
  </div>
</div>

<style lang="postcss">
    .inputarea {
        background: var(--questions-bg);
        height: 97vh;
        overflow-y: auto;
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
        position: static !important; /* override old absolute style if needed */
        bottom: 0;
        left: 15%;
    }
</style>



