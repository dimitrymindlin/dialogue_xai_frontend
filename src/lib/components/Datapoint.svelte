<script lang="ts">
    export let header: string[];
    export let grouped_data: { title: string; items: string[][] }[] = []
    export let feature_tooltips: { [key: string]: string };
    export let feature_units: { [key: string]: string };
    let showAdditionalInfo = false; // controls the toggle for "additional info"
    export let feature_names: TFeatureName[];
    import TooltipIcon from './TooltipIcon.svelte';
    import type {TFeatureName} from '$lib/types';

    // Normalize a string by removing spaces and converting to lower case for comparison
    function normalizeString(str: string): string {
        return str.replace(/\s+/g, '').toLowerCase();
    }

    // Normalize feature_names for comparison
    let normalizedFeatureNames = feature_names.map(f => ({
        original: f,
        normalized: normalizeString(f.feature_name)
    }));

</script>

<div class="table-container w-[90%] mx-auto">
    <table class="table table-hover">
        <thead>
        </thead>
        <tbody>
        {#each grouped_data as group}
            <!-- Group Title Row -->
            <tr class="group-title">
                <td colspan={header.length}>
                    <div>
                        <strong>{group.title}</strong>

                        <!-- If group title is "additional info", show a toggle button -->
                        {#if group.title === "additionalInfo"}
                            <button on:click={() => showAdditionalInfo = !showAdditionalInfo}>
                                {showAdditionalInfo ? 'Weniger Infos' : 'Mehr Infos'}
                            </button>
                        {/if}
                    </div>
                </td>
            </tr>

            <!-- Grouped Items -->
            <!-- If group title is "additional info", conditionally show items based on toggle -->
            {#if group.title !== "additionalInfo" || showAdditionalInfo}
                {#each group.items as row}
                    <tr class="{row[1].includes('Current:') ? 'highlighted' : ''}">
                        <td>
                            {#if group.title === 'additionalInfo'}
                                <!-- Show the entire row[0] if it's additionalInfo -->
                                <span>{row[0]}</span>
                            {:else}
                                <!-- Otherwise, keep splitting row[0] -->
                                <span>{row[0].split('-')[1]}</span>
                            {/if}
                            {#if feature_tooltips[row[0].toLowerCase()]}
                                <TooltipIcon class="tooltipIcon" message={feature_tooltips[row[0].toLowerCase()]}/>
                            {/if}
                        </td>
                        <td>
                            {#if row[1].includes('Current:')}
                                {@html row[1].replace(/Current: ([^,]+), Old: (.+)/, (match, current, old) =>
                                    `<strong>${current}</strong> <s>${old}</s>`)}
                            {:else}
                                <span>{row[1]}</span>
                            {/if}
                            {#if feature_units[row[0].toLowerCase()]}
                                <span> {feature_units[row[0].toLowerCase()]}</span>
                            {/if}
                        </td>
                    </tr>
                {/each}
            {/if}
        {/each}
        </tbody>
    </table>
</div>


<style lang="postcss">
    .table {
        width: 100%; /* Ensure the table takes up the full width */
        table-layout: fixed; /* Enables control over column widths */
        border-collapse: collapse; /* Removes unnecessary spacing between table cells */
    }

    .table tbody td {
        padding: 0.2rem 0.5rem; /* Compact padding for table cells */
        vertical-align: middle; /* Align content in the middle of the cell */
    }

    .table tbody td:first-child {
        width: 70%; /* Left column takes 70% */
        text-align: left; /* Align text to the left */
    }

    .table tbody td:last-child {
        width: 30%; /* Right column takes 30% */
        text-align: right; /* Align text to the right */
    }

    /* Ensuring the tooltip is not clipped */
    .table-container, .table {
        overflow: visible;
    }

    .tooltipIcon {
        margin: 5px; /* Reduced margin for compact design */
    }

    s {
        color: #999; /* Light grey for the old value */
        text-decoration: line-through;
    }

    strong {
        color: #000; /* Black or a bold color for the new value */
        font-weight: bold;
    }

    /* Compact Styles for Group Titles */
    .group-title td div {
        font-size: 0.9rem; /* Smaller font size */
        text-align: left;
    }
</style>