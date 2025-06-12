<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper, RangeSlider} from '@skeletonlabs/skeleton';
    import backend from '$lib/backend';
    import {logAttentionCheck} from '$lib/attentioncheck.ts';
    import { env } from '$env/dynamic/public';
    import { getQuestionnaireConfig, type QuestionnaireConfig } from '$lib/questionnaire-data';

    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;

    export let user_id: string;
    export let study_group: string = '';
    export let dataset: string = PUBLIC_DATASET_NAME || 'adult';

    let currentStep = 0;

    function onNext() {
        currentStep++;
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }

    // Get the appropriate questionnaire configuration
    const config: QuestionnaireConfig = getQuestionnaireConfig(dataset, study_group);
    const { questions, attentionCheck, title, subtitle } = config;

    let chunks = [];
    const questions_per_page = 7;
    for (let i = 0; i < questions.length; i += questions_per_page) {
        chunks.push(questions.slice(i, i + questions_per_page));
    }

    // Create Answer Array
    let answers = new Array(questions.length).fill(0);

    // Save Answers to Database
    async function onComplete() {
        // Log attention check if it exists
        if (attentionCheck) {
            let user_answer = answers[attentionCheck.questionIndex].toString();
            await logAttentionCheck(user_id, attentionCheck.checkId, user_answer, attentionCheck.correctAnswer);
        }

        // Save the answers when the user completes the questionnaire
        await Promise.all([
            fetch(`${base}/api/exit/questionnaire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    questions: questions,
                    answers: answers,
                    questionnaire_name: 'exit'
                })
            }),
            backend.xai(user_id).finish()
        ]);
        goto(`${base}/exit/feedback/${dataset}/?user_id=${user_id}`);
    }
</script>

<div>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper {currentStep} stepTerm="Questions" on:step={onNext} on:complete={onComplete}>
        {#each chunks as chunk, chunkIndex}
            <Step>
                <h1 class="center-text text-xl">{@html title}</h1>
                {#if subtitle}
                    <h1 class="center-text text-xl">{@html subtitle}</h1>
                {/if}
                {#each chunk as question, i}
                    <div class="flex">
                        <div class="question-column">
                            <span class="question align-middle">
                                {question}
                            </span>
                        </div>
                        <div class="slider-column">
                            <RangeSlider name="range-slider" bind:value={answers[chunkIndex * questions_per_page + i]} min={-3} max={3}
                                         step={1} ticked>
                                <div class="flex justify-between items-center">
                                    <div class="text-xs">Strongly Disagree</div>
                                    <div class="text-xs">Neither agree nor disagree</div>
                                    <div class="text-xs">Strongly Agree</div>
                                </div>
                            </RangeSlider>
                            <div class="labels flex justify-between">
                                <span class="small-text">-3</span>
                                <span class="small-text">-2</span>
                                <span class="small-text">-1</span>
                                <span class="small-text">0</span>
                                <span class="small-text">1</span>
                                <span class="small-text">2</span>
                                <span class="small-text">3</span>
                            </div>
                        </div>
                    </div>
                    <hr>
                {/each}
            </Step>
        {/each}
    </Stepper>
</div>

<style>
    .center-text {
        display: block;
        text-align: center;
    }

    .small-text {
        font-size: 0.8em;
    }

    .flex {
        display: flex;
        justify-content: space-between;
        margin-bottom: 9px;
        align-items: center;
    }

    .flex:last-child {
        border-bottom: none;
    }

    .question-column {
        flex: 0.80;
        margin-right: 10px;
        align-items: center;
    }

    .slider-column {
        flex: 0.75;
    }
</style>