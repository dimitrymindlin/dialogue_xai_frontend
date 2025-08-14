<script lang="ts">
    import {userId} from '$lib/shared';
    import {get_attention_checks_failed, get_comprehension_check_failed} from '$lib/attentioncheck.ts';
    import {env} from '$env/dynamic/public';
    
    const prolific_url_passed = `https://app.prolific.com/submissions/complete?cc=${env.PUBLIC_PROLIFIC_CODE_PASSED}`;
    const prolific_url_attention_failed = `https://app.prolific.com/submissions/complete?cc=${env.PUBLIC_PROLIFIC_CODE_ATTENTION_FAILED}`;
    const prolific_return_url = `https://app.prolific.com/submissions/complete?cc=${env.PUBLIC_PROLIFIC_CODE_RETURN}`;

    let user_id;

    async function returnToProlific() {
        user_id = userId.get();
        if (await get_attention_checks_failed(user_id)) {
            window.location.href = prolific_url_attention_failed;
        } else if (await get_comprehension_check_failed(user_id)) {
            window.location.href = prolific_return_url;
        } else {
            // Redirect to Prolific
            window.location.href = prolific_url_passed;
        }
    }
</script>


<div class="col-start-2 col-end-3 center-content">
    <div class="content-container">
        <p>Thank you! You are done. <br> Your experiment data has been anonymized.
            <br>Click the button to complete the
            experiment and return to prolific.</p>
        <button class="end-btn" on:click={returnToProlific}>Finish Experiment</button>
    </div>
</div>

<style>
    .center-content {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }

    .end-btn {
        @apply bg-black text-white rounded-lg cursor-pointer mx-0 my-5 px-5 py-3.5 border-none;
        margin-top: 10px;
        width: 100%;
    }
</style>
