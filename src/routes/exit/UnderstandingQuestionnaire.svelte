<script lang="ts">
    import {base} from '$app/paths';
    import {Step, Stepper} from '@skeletonlabs/skeleton';
    import {createEventDispatcher} from "svelte";
    import SubmitButton from "$lib/components/SubmitButton.svelte";
    import {env} from '$env/dynamic/public';

    export let user_id: string;
    export let dataset: string = env.PUBLIC_DATASET_NAME || 'adult';
    export let studyGroup: string;

    const dispatch = createEventDispatcher();

    let most_imp_val = "";
    let lest_imp_val = "";
    let decision_rules_text = "";
    let unexpedted_text = "";

    // Dataset-specific configurations
    const datasetConfigs = {
        adult: {
            questions: [
                "1. You have seen different people and their attributes. Which attribute was <b>often the most important</b> for the model’s decision?",
                "2. Which attribute was <b>taken into account</b> by the model but <b>usually had little to no influence</b> on its prediction?<br>",
                "3. What <b>rules</b> do you think the model uses to <b>decide between\n" +
                "individuals</b> earning over 50k and under 50k? While the model uses complex patterns, what rules or patterns could you spot?",
                "4. (Optional) Is there anything <b>surprising or unexpected</b> you found in the model? Or something you <b>did not understand</b> despite the explanations?"
            ],
            options: [
                "Age",
                "Gender",
                "Marital Status",
                "Year of Career Start",
                "Work Life Balance"
            ],
            values: [
                "age",
                "gender",
                "maritalStatus",
                "yearOfCareerStart",
                "workLifeBalance"
            ],
            correctAnswers: ["maritalStatus", "workLifeBalance", "..."],
            placeholders: {
                rules: "I found that the model uses... I think the model distinguishes by...",
                unexpected: "It was unexpected that ... I did not understand ..."
            },
            title: "Almost done! <br> Here are <b>three final questions</b> about your <b>model understanding</b>.",
            titleBaseline: "Almost done! <br> Here are <b>three final questions</b> about your <b>experience predicting the model</b>.",
            questionsBaseline: [
                "1. You have seen different people and their attributes. Which attribute did you <b>notice most often</b> when the model made its decisions?",
                "2. Which attribute seemed to have <b>little effect</b> on the model's predictions?<br>",
                "3. What <b>patterns</b> did you notice in the model's predictions? Based on what you observed, what patterns could you spot?",
                "4. (Optional) Was there anything <b>surprising or unexpected</b> about the model's predictions? Or anything you found difficult to predict?"
            ],
            placeholdersBaseline: {
                rules: "I noticed that the model often predicted... I think the model tends to...",
                unexpected: "It was unexpected that the model... I found it difficult to predict when..."
            }
        },
        diabetes: {
            questions: [
                "1. The model made predictions based on the data it was trained with. In this data, each person was captured by " +
                "certain attributes. Which attribute was often the <b>most important</b> for the model's decision about diabetes risk?",
                "2. Which attribute was the <b>least important</b> for the model's decision, but taken into account for the prediction?" +
                "(The model looked at this attribute to make the prediction, but it had usually little to no influence.)",
                "3. What <b>rules</b> do you think the model uses to <b>decide between\n" +
                "individuals</b> with and without diabetes? While the model uses complex patterns, what rules or patterns could you spot?",
                "4. (Optional) Is there anything <b>surprising or unexpected</b> you found in the model? Or something you <b>did not understand</b> despite the explanations?"
            ],
            options: [
                "Gender",
                "Glucose",
                "Daily Water Intake",
                "Insulin",
                "Blood Group",
            ],
            values: [
                "gender",
                "glucose",
                "dailywaterintake",
                "insulin",
                "bloodgGroup",
            ],
            correctAnswers: ["glucose", "dailywaterintake", "..."],
            placeholders: {
                rules: "I found that the model uses... I think the model distinguishes by...",
                unexpected: "It was unexpected that ... I did not understand ..."
            },
            title: "Almost done! <br> Here are <b>three final questions</b> about your <b>understanding of the diabetes prediction model</b>.",
            titleBaseline: "Almost done! <br> Here are <b>three final questions</b> about your <b>experience predicting the model</b>.",
            questionsBaseline: [
                "1. The model made predictions based on the data it was trained with. Which attribute did you <b>notice most often</b> when the model made its diabetes predictions?",
                "2. Which attribute seemed to have <b>little effect</b> on the model's diabetes predictions?",
                "3. What <b>patterns</b> did you notice in the model's diabetes predictions? Based on what you observed, what patterns could you spot?",
                "4. (Optional) Was there anything <b>surprising or unexpected</b> about the model's predictions? Or anything you found difficult to predict?"
            ],
            placeholdersBaseline: {
                rules: "I noticed that the model often predicted... I think the model tends to...",
                unexpected: "It was unexpected that the model... I found it difficult to predict when..."
            }
        }
    };

    // Select the right configuration based on the dataset and study group
    const config = datasetConfigs[dataset] || datasetConfigs.adult;
    $: questions = studyGroup === 'baseline' ? config.questionsBaseline : config.questions;
    $: title = studyGroup === 'baseline' ? config.titleBaseline : config.title;
    $: placeholders = studyGroup === 'baseline' ? config.placeholdersBaseline : config.placeholders;

    // Validate form before submitting
    function validateForm() {
        if (!most_imp_val || !lest_imp_val || !decision_rules_text.trim()) {
            alert("Please complete all questions before submitting.");
            return false;
        }
        return true;
    }

    // Save Answers to Database
    async function onComplete() {
        if (!validateForm()) return;

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
                    answers: [most_imp_val, lest_imp_val, decision_rules_text, unexpedted_text],
                    correct_answers: config.correctAnswers,
                    questionnaire_name: 'understanding'
                })
            }),
        ]);
        dispatch('complete');
    }
</script>

<div>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper stepTerm="Final Test">
        <Step>
            <h1 class="center-text text-xl">{@html title}</h1>
            <div class="flex-container">
                <label class="label text-center flex-item">
                    <span>{@html questions[0]}</span>
                    <select bind:value={most_imp_val} class="select py-1">
                        <option value="" selected>- Select -</option>
                        {#each config.options as option, i}
                            <option value={config.values[i]}>{option}</option>
                        {/each}
                    </select>
                </label>
                <label class="label text-center flex-item">
                    <span>{@html questions[1]}</span>
                    <select bind:value={lest_imp_val} class="select py-1">
                        <option value="" selected>- Select -</option>
                        {#each config.options as option, i}
                            <option value={config.values[i]}>{option}</option>
                        {/each}
                    </select>
                </label>
            </div>
            <br>
            <span>{@html questions[2]}</span>
            <textarea bind:value={decision_rules_text} class="textarea-full-width"
                      placeholder={placeholders.rules}></textarea>
            <br>
            <span>{@html questions[3]}</span>
            <textarea bind:value={unexpedted_text} class="textarea-full-width"
                      placeholder={placeholders.unexpected}></textarea>
            <div class="button-container">
                <SubmitButton next={onComplete} label="Submit" customStyle="padding: 15px; margin-top: 10px;"/>
            </div>
        </Step>
    </Stepper>
</div>

<style>
    .button-container {
        display: flex;
        justify-content: flex-end;
        margin-top: 1em;
    }

    .center-text {
        display: block;
        text-align: center;
    }

    .flex-container {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1em;
    }

    .flex-item {
        flex: 1;
        margin-right: 1em;
    }

    .flex-item:last-child {
        margin-right: 0;
    }

    .select {
        height: 2.5em; /* Adjust the height as needed */
    }

    .textarea-full-width {
        width: 100%;
        height: 6em; /* Adjust the height as needed */
        resize: vertical; /* Allow users to resize if needed */
    }

    .input-area button {
        @apply rounded-lg cursor-pointer px-8 py-2.5 border-2;
        margin-right: 10px;
    }
</style>
