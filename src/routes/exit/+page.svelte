<script>
    import ExitQuestionnaire from '$lib/components/ExitQuestionnaire.svelte';
    import UnderstandingQuestionnaire from './UnderstandingQuestionnaire.svelte';
    import { env } from '$env/dynamic/public';

    import {userId, studyGroup} from "$lib/shared.ts";

    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;

    let user_id;
    let study_group;
    let understandingCompleted = false;

    if (typeof window !== 'undefined') {
        user_id = userId.get();
        study_group = studyGroup.get();
    }

    // Function to handle the completion of the UnderstandingQuestionnaire
    function handleUnderstandingComplete() {
        understandingCompleted = true;
    }
</script>

<div class="col-span-3 space-y-4 p-6 sm:p-8 md:space-y-6 w-3/4 mx-auto">
    {#if user_id}
        {#if !understandingCompleted}
            <UnderstandingQuestionnaire {user_id} studyGroup={study_group} dataset={PUBLIC_DATASET_NAME || 'adult'} on:complete={handleUnderstandingComplete}/>
        {:else}
            <ExitQuestionnaire {user_id} study_group={study_group} dataset={PUBLIC_DATASET_NAME || 'adult'} />
        {/if}
    {/if}
</div>