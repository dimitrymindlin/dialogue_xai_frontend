<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper, RangeSlider} from '@skeletonlabs/skeleton';
    import backend from '$lib/backend';
    import {logAttentionCheck} from '$lib/attentioncheck.ts';
    import { env } from '$env/dynamic/public';
    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;

    export let user_id: string;
    export let study_group: string;

    let currentStep = 0;

    function onNext() {
        currentStep++;
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0);
        }
    }

    let interactive_group_questions = [
        'The chatbot is cooperative.',
        'I like the chatbot.',
        "While explaining, the chatbot met me halfway.",
        'The chatbot has no clue of what it is doing.',
        "The chatbot intended to provide me with the opportunity to build an understanding of the topic by asking questions.",
        "The chatbot encouraged me to continuously think about further details of the topic.",
        'The chatbot always gives good advice.',
        'The chatbot can collaborate in a productive way.',
        "The chatbot considered my understanding.",
        'The chatbot acts truthfully.',
        'The chatbots appears confused.',
        "While explaining, it was important for the chatbot to monitor whether I understood everything.",
        "The chatbot responded when I signaled non-understanding.",
        'The chatbot interacts socially with me.',
        "The chatbot took my statements into account.",
        'The chatbot acts intentionally',
        'I can see myself using the chatbot in the future.',
        'When finishing to read this sentence, select Strongly Disagree to prove that you pay attention.',
        "When learning about a new topic, it’s better to think about details yourself, rather than having everything fully explained.",
        "While explaining, it was important for the chatbot to continuously consider whether I understood the explanation.",
        "The chatbot encouraged me to visualize the different processes of the topic.",
        'I can rely on the chatbot.',
        'The chatbot is easy to use.',
        "The explanation was meant to encourage me to question my understanding.",
        "The chatbot carefully adapted its utterances to my responses."
    ];

    let static_group_questions = [
        "The explanation report is coherent.",
        "I find the explanation report useful.",
        "The explanation report is clear and understandable.",
        "The explanation report provides insightful information.",
        "The explanation report supports productive insights.",
        "The information in the report is presented accurately.",
        "The explanation report seems confusing.",
        "The explanation report is engaging.",
        'I pay attention. Select -1 to prove it.',
        "The explanation report presents information purposefully.",
        "I can see myself referring to this type of explanation report in the future.",
        "I can rely on the information provided in the explanation report.",
        "The explanation report is easy to navigate and understand."
    ];

    // Decide which questions to use based on the study group
    let study_questions: string[] = [];
    if (study_group === 'static') {
        study_questions = static_group_questions;
    } else { // interactive or chat
        study_questions = interactive_group_questions;
    }

    const attention_check_col_id = 8;
    const attention_check_correct_answer = "-1";
    const attention_check_id = "4";

    let chunks = [];
    const questions_per_page = 7;
    for (let i = 0; i < study_questions.length; i += questions_per_page) {
        chunks.push(study_questions.slice(i, i + questions_per_page));
    }

    // Create Answer Array
    let answers = new Array(study_questions.length).fill(0);

    // Save Answers to Database
    async function onComplete() {
        // Log attention check seperately
        let user_answer = answers[attention_check_col_id].toString();
        await logAttentionCheck(user_id, attention_check_id, user_answer, attention_check_correct_answer);

        // Save the answers when the user completes the questionnaire
        await Promise.all([
            fetch(`${base}/api/exit/questionnaire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    questions: study_questions,
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
                <h1 class="center-text text-xl">You are done <b>with the tasks</b>. <b>Thank you!</b></h1>
                <h1 class="center-text text-xl">Lastly, we are interested in <b>how you liked to work with the Chatbot</b> to understand the models decisions.</h1>
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
        font-size: 0.8em; /* Adjust as needed */
    }

    .flex {
        display: flex;
        justify-content: space-between;
        margin-bottom: 9px; /* adjust this value to create more space between the rows */
        align-items: center;
    }

    /* remove the bottom border from the last row */
    .flex:last-child {
        border-bottom: none;
    }

    .question-column {
        flex: 0.80; /* this will make the question column take up 25% of the total width */
        margin-right: 10px;
        align-items: center;
    }

    .slider-column {
        flex: 0.75; /* this will make the slider column take up 75% of the total width */
    }

</style>