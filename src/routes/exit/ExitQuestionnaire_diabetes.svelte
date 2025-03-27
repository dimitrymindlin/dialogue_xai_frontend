<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper, RangeSlider} from '@skeletonlabs/skeleton';
    import backend from '$lib/backend';
    import { env } from '$env/dynamic/public';

    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;

    export let user_id: string;
    let currentStep = 0;

    function onNext() {
        currentStep++;
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }

    let shuffled_questions = [
        'The Chatbot is cooperative.',
        'I like the Chatbot.',
        'The chatbot has no clue of what it is doing.',
        'The chatbot always gives good advice.',
        'The chatbot can collaborate in a productive way.',
        'The chatbot acts truthfully.',
        'The chatbots appears confused.',
        'The Chatbot interacts socially with me.',
        'The chatbot acts intentionally',
        'I can see myself using the Chatbot in the future.',
        'I can rely on the chatbot.',
        'The Chatbot is easy to use.',
        'The chatbot understands me.',
        'I am not just clicking randomly and I can prove it by selecting -2.',
        'I was concentrated during the interaction with the chatbot.',
        'Learning to work with the Chatbot is easy.',
        'The interaction captured my attention.',
        'The chatbots’s behavior does not make sense.',
        'The Chatbot does its task well',
        'I dislike the Chatbot.',
        'I am capable of succeeding with the Chatbot',
    ];

    let chunks = [];
    const questions_per_page = 7;
    for (let i = 0; i < shuffled_questions.length; i += questions_per_page) {
        chunks.push(shuffled_questions.slice(i, i + questions_per_page));
    }

    // Create Answer Array
    let answers = new Array(shuffled_questions.length).fill(0);

    // Save Answers to Database
    async function onComplete() {
        // Save the answers when the user completes the questionnaire
        await Promise.all([
            fetch(`${base}/api/exit/questionnaire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    questions: shuffled_questions,
                    answers: answers,
                    questionnaire_name: 'exit'
                })
            }),
            backend.xai(user_id).finish()
        ]);
        goto(`${base}/exit/feedback/${PUBLIC_DATASET_NAME}/?user_id=${user_id}`);
    }
</script>

<div>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper {currentStep} stepTerm="Questions" on:step={onNext} on:complete={onComplete}>
        {#each chunks as chunk, chunkIndex}
            <Step>
                <h1 class="center-text text-xl">Please answer the following questions and give us feedback to
                    improve.</h1>
                {#each chunk as question, i}
                    <div class="flex">
                        <div class="question-column">
                    <span class="question align-middle">
                        {question}
                    </span>
                        </div>
                        <div class="slider-column">
                            <RangeSlider name="range-slider" bind:value={answers[chunkIndex * 7 + i]} min={-3} max={3}
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
        font-size: 0.8em; /* Adjust as needed */
    }

    .flex {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px; /* adjust this value to create more space between the rows */
        border-bottom: 1px solid #000; /* add a bottom border to each row */
        align-items: center;
    }

    /* remove the bottom border from the last row */
    .flex:last-child {
        border-bottom: none;
    }

    .question-column {
        flex: 0.25; /* this will make the question column take up 25% of the total width */
        margin-right: 20px;
        align-items: center;
    }

    .slider-column {
        flex: 0.75; /* this will make the slider column take up 75% of the total width */
    }

</style>