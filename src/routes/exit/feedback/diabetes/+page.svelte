<script lang="ts">
    import FeedbackWindow from "$lib/components/FeedbackWindow.svelte";
    import {base} from '$app/paths';
    import backend from "$lib/backend";
    import {goto} from "$app/navigation";
    import {userId} from '$lib/shared';
    import { env } from '$env/dynamic/public';

    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;

    let user_id;
    if (typeof window !== 'undefined') {
        user_id = userId.get();
    }

    async function handleFeedbackSubmit(event) {
        const {feedback} = event.detail;

        try {
            // Submit feedback to the backend
            const response = await fetch(`${base}/api/exit/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({user_id, feedback}),
            });

            if (!response.ok) throw new Error('Failed to submit feedback');

            await backend.xai(user_id).finish();
            goto(`${base}/exit/endscreen/${PUBLIC_DATASET_NAME}`);
        } catch (error) {
            console.error("Error during feedback submission:", error);
        }
    }
</script>

<div class="center-page">
    <h1 class="center-text text-xl"><b>Thank you for your participation!</b></h1>

    <h1 class="center-text text-xl">
        By participating, you help to <b>bridge the gap between AI and humans.</b> <br>
        With our research project we aim to understand how different people <b>understand the <br>
        predictions of machine learning models</b> in order to <b>foster trust in AI and transparency.</b> <br> <br>
    </h1>

    <h1 class="center-text">Please leave any <b>additional opinion and feedback</b> about the experiment :)</h1>
    <FeedbackWindow
            placeholder="To me, the experiment was... I liked ... I did not understand ..."
            submitLabel="End Experiment"
            on:feedbackSubmit={handleFeedbackSubmit}
    />

    <h1>You can contact me in case you have any questions: <br>
        <b>dimitry.mindlin@uni-bielefeld.de</b> <br></h1>
</div>


<style>
    .center-text {
        display: block;
        text-align: center;
    }

    .center-page {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        width: 100vw;
        margin: 5vh;
    }
</style>