<script>
    import {createEventDispatcher} from 'svelte';
    import {Step, RadioGroup, RadioItem, Stepper} from "@skeletonlabs/skeleton";
    import {base} from "$app/paths";

    const dispatch = createEventDispatcher();

    export let user_id;
    export let study_group;

    export let user_study_task_description;

    let teaching_intro = "";


    async function onComplete() {
        // Log answers and attention check
        // Log attention check seperately
        let attention_check_selection = answers[attention_check_col_id].toString();
        // For logging the attention check
        let logging_information = {
            correct: attention_check_correct_answer,
            selected: attention_check_selection
        };
        const attention_check_id = "2";
        fetch(`${base}/api/log_attention_check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user_id,
                check_id: attention_check_id,
                information: logging_information
            })
        });
        dispatch('confirm');
    }

    let questions = [
        'The task was easy.',
        'I have a good understanding of which factors most influence the income of an individual.',
        'I swim across the Atlantic Ocean every morning.',
        'I am confident in my predictions.',
        'I am not sure about my predictions.',
    ];

    const attention_check_col_id = 2;
    const attention_check_correct_answer = ['-2', '-1'];

    // Create Answer Array
    let answers = new Array(questions.length).fill(0);

    const taskDescription = `Your <b>next task</b> will be to guess <b>${user_study_task_description}</b>.<br><br>`;
    const followUpActionStatic = "Afterward, you can <b>see the AI's prediction</b> and read the provided explanations";
    const followUpActionDynamic = "Afterward, you can <b>see the AI's prediction</b> and ask questions through the chatbot";
    const commonConclusion = "to <b>understand the reason for the model's prediction</b> and enhance your understanding of the decision-making process";

    teaching_intro = `${taskDescription} ${study_group === 'static' ? `${followUpActionStatic} ${commonConclusion}.` : `${followUpActionDynamic} ${commonConclusion}.`}`;

</script>

<div class="overlay">
    <div class="popup">
        <Stepper stepTerm="Step" on:complete={onComplete} buttonCompleteLabel="Continue Experiment">
            <Step>
                <h1 class="text-center text-xl">You are done with the first phase.</h1>
            </Step>
            <Step>
                <h1 class="text-center text-xl">Please indicate your agreement on the following statements.</h1>
                {#each questions as question, i}
                    <div class="slider-flex">
                        <div class="question-column">
                            <span class="question align-middle">
                                {question}
                            </span>
                        </div>
                        <div class="slider-column">
                            <RadioGroup>
                                <RadioItem name="likert" bind:group={answers[i]} value={-2}>Strongly disagree
                                </RadioItem>
                                <RadioItem name="likert" bind:group={answers[i]} value={-1}>Somewhat disagree
                                </RadioItem>
                                <RadioItem name="likert" bind:group={answers[i]} value={0}>Neutral
                                </RadioItem>
                                <RadioItem name="likert" bind:group={answers[i]} value={1}>Somewhat agree</RadioItem>
                                <RadioItem name="likert" bind:group={answers[i]} value={2}>Strongly agree</RadioItem>
                            </RadioGroup>
                        </div>
                    </div>
                    <hr>
                {/each}
            </Step>
            <Step>
                <h1 class=" text-center text-xl">{@html teaching_intro}</h1>
            </Step>
        </Stepper>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .popup {
        position: relative;
        width: 80%;
        height: 80%;
        background-color: white;
        border-radius: 10px;
        padding: 40px;
        box-sizing: border-box;
        overflow: auto;
    }

    .slider-flex {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px; /* adjust this value to create more space between the rows */

        align-items: center;
    }

    .question-column {
        flex: 0.25; /* this will make the question column take up 25% of the total width */
        margin-right: 20px;
        align-items: center;
    }

    .slider-column {
        flex: 0.75; /* this will make the slider column take up 75% of the total width */
    }

    .text-center {
        margin-bottom: 30px; /* adjust this value to create more space */
    }

</style>