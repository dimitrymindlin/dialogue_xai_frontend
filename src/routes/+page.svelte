<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {userId} from '$lib/shared';
    import {env} from '$env/dynamic/public';

    const PUBLIC_DATASET_NAME = env.PUBLIC_DATASET_NAME;
    const PUBLIC_SHOW_TOOL = env.PUBLIC_SHOW_TOOL;

    // Convert string to boolean (because environment variables are always strings)
    let show_tool = PUBLIC_SHOW_TOOL === 'true';

    function newExperiment() {
        userId.set(crypto.randomUUID());
        goto(`${base}/intro/${PUBLIC_DATASET_NAME}`);
    }

    function startTool() {
        goto(`${base}/tool`);
    }
</script>

<div class="col-start-2 col-end-3"
     style="display: flex !important; justify-content: center !important; align-items: center !important;">
    <button type="button" class="btn btn-xl variant-filled" on:click={newExperiment}>Start experiment</button>
</div>


{#if show_tool}
    <div class="col-start-2 col-end-3"
         style="display: flex !important; justify-content: center !important; align-items: center !important;">
        <button type="button" class="btn btn-xl variant-filled" on:click={startTool}>Start Tool</button>
    </div>
{/if}