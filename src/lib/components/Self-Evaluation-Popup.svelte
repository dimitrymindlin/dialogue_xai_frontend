<script>
    import {createEventDispatcher, onMount} from 'svelte';
    import {RadioGroup, RadioItem, Step, Stepper} from "@skeletonlabs/skeleton";
    import backend from "$lib/backend";
    import {base} from "$app/paths";
    import {logAttentionCheck} from '$lib/attentioncheck.ts';


    const dispatch = createEventDispatcher();

    export let user_id;

    let user_correctness_string;

    onMount(async () => {
        const response = await backend.xai(user_id).get_user_correctness();
        user_correctness_string = await response.json().then(data => {
            return data.correctness_string;
        })
    });

    // Setup questions and attention check
    let questions = [
        'I understand the important attributes for a decision.',
        'I cannot distinguish between the possible prediction.',
        'I understand how the Machine Learning model works.',
        'Select "Strongly Disagree" for this selection.',
        'I did not understand how the Machine Learning model makes decisions.'
    ];
    const attention_check_question_id = 3;
    const correct_attribute = '-2';
    const attention_check_id = "3";

    let answers = Array(questions.length).fill(0);

    async function onComplete() {
        // Log attention check seperately
        let user_answer = answers[attention_check_question_id].toString();
        await logAttentionCheck(user_id, attention_check_id, user_answer, correct_attribute);

        // Save the answers when the user completes the questionnaire
        await fetch(`${base}/api/exit/questionnaire`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user_id,
                questions: questions,
                answers: answers,
                questionnaire_name: 'self_assessment'
            })
        });
        dispatch('confirm');
    }


</script>

<div class="overlay">
    <div class="popup">
        <Stepper stepTerm="Step" on:complete={onComplete} buttonCompleteLabel="Continue Experiment">
            <Step>
                <p class="text-center text-xl">
                    How would you rate your understanding of the model's decision process? <br>
                </p>

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
                <h1 class="text-center text-2xl">You are done with the <b>explanation phase</b> <br> where you had the
                    opportunity to <b>learn about the machine learning model's</b> decision.
                    <br><br>
                    You <b>correctly answered {user_correctness_string}</b> of the test cases.</h1>
            </Step>
            <Step>
                <p class="text-center text-xl">
                    <b>Almost done!</b><br> <br>
                    As a <b>final task</b>, you will see new individuals<br> and will be asked to <b>predict what the model would choose for them</b>. <br>No explanations will be shown.<br>
                </p>
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