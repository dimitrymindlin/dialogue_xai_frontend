<script>

    import {goto} from "$app/navigation";
    import {base} from "$app/paths";
    import '../../../global.css';
    import {onMount} from 'svelte';
    import {userId, studyGroup, userMLKnowledge} from '$lib/shared.ts';
    import Spinner from '$lib/components/Spinner.svelte';
    import {logAttentionCheck} from '$lib/attentioncheck.ts';
    import SubmitButton from '$lib/components/SubmitButton.svelte';

    let user_id;
    let study_group;
    let user_ml_knowledge;

    let isLoading = false;

    onMount(async () => {
        user_id = await userId.get();
        study_group = await studyGroup.get();
        user_ml_knowledge = await userMLKnowledge.get();
    });

    let selected_statement = ""; // To store the user's selection
    const statements = [
        "Assess whether the individual is likely to succeed in their career",
        "Guess whether the AI model would predict the individual to earn more or less than 50k a year",
        "Identify key factors that influence an individual’s salary",
        "Decide if the AI model’s prediction is fair",
        "Predict the individual's actual salary based on their attributes"
    ];
    const correct_statement = "Guess whether the AI model would predict the individual to earn more or less than 50k a year";
    const attention_check_counter = "1";
    let attention_check_tries = 0;

    // Function to handle the selection, if needed
    async function handleSelection() {
        // If correct, log and proceed
        if (selected_statement === correct_statement) {
            isLoading = true;
            logAttentionCheck(user_id, attention_check_counter, selected_statement, correct_statement);
            // Use correct function or method for redirection
            const route = study_group === 'baseline' ? 'baseline' : 'experiment';
            await goto(`${base}/${route}?user_id=${user_id}&sg=${study_group}&user_ml_knowledge=${user_ml_knowledge}`);
            isLoading = false;
            return; // Prevent further execution
        }
        // Handling incorrect selections
        if (attention_check_tries < 1) {
            attention_check_tries++;
            alert("You have selected the wrong answer. Please read the instructions and try again.");
            selected_statement = ""; // Reset for a new attempt
        } else {
            // Final attempt logic
            logAttentionCheck(user_id, attention_check_counter, selected_statement, correct_statement);
            await alert("ATTENTION: You have selected the wrong answer twice. We ask you to return the study. Please close the survey and click " +
                "'Stop Without Completing' on Prolific.");
            isLoading = true;
            const route = study_group === 'baseline' ? 'baseline' : 'experiment';
            await goto(`${base}/${route}?user_id=${user_id}&sg=${study_group}`);
            isLoading = false;
        }
    }
</script>

<div class="modal">
{#if study_group === 'baseline'}
        <h2>This experiment is divided into three parts. First, in the prediction phase, you'll see a person's profile and
            guess whether the AI model predicts they earn more or less than $50,000 per year. After making your guess,
            you'll see the AI's actual prediction and compare your results.

            Next comes the testing phase, where you'll make similar guesses to test your ability to predict what the AI will decide.

            Finally, in the final testing phase, you'll go through multiple rounds to see how well you can predict the
            AI's decisions.
        </h2>
    {:else}
        <h2>This experiment is divided into three parts. First, in the learning phase, you'll see a person's profile and
            guess whether the AI model predicts they earn more or less than $50,000 per year. After making your guess,
            you'll see the AI's actual prediction along with explanations to help you understand its reasoning.

            Next comes the testing phase, where you'll make similar guesses—but this time, you won't see the AI's
            explanation. Instead, you'll rely on what you've learned so far.

            Finally, in the final testing phase, you'll go through multiple rounds to deepen your understanding of how the
            AI makes decisions.
        </h2>
    {/if}
    <br>
    {#if isLoading}
        <Spinner dark_background={false}/>
    {/if}
    <p>Based on what you’ve read, what will you be asked to do when you see a persons profile? If you’re unsure, go back
        and
        review the instructions. You have two chances to answer correctly.</p>
    <p><i>Pleas re-read the instructions if you are not sure. You will have two opportunities to get this question
        correct.</i></p>
    <select bind:value={selected_statement} class="select">
        <option value="" disabled selected>Select the correct statement</option>
        {#each statements as statement}
            <option value={statement}>{statement}</option>
        {/each}
    </select>
    <SubmitButton next={handleSelection}
                  customStyle="padding: 10px; margin-top: 10px;"/>
</div>

<style>
    html, body {
        height: 100%;
        margin: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: transparent;
    }

    /* Directly style the modal for centering, width is up to your design */
    .modal {
        width: 500px; /* Or whatever width you prefer */
        padding: 20px;
        padding-bottom: 100px; /* Adjust this value to the height of your submit button plus some extra space */
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        background: white; /* or any color you prefer */
        border-radius: 4px; /* Optional: for rounded corners */
        position: fixed; /* This will ensure the modal is positioned in relation to the viewport */
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%); /* This will center the modal perfectly */
        z-index: 1000; /* Ensure it's above other content */
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }

    .select {
        width: 100%;
        padding: 10px;
        margin-top: 10px;
    }

</style>
