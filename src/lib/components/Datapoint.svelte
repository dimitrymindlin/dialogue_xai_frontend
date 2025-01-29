<script lang="ts">
    export let header: string[];
    export let grouped_data: { title: string; items: string[][] }[] = []
    export let feature_tooltips: { [key: string]: string };
    export let feature_units: { [key: string]: string };
    let activeTab: 'general' | 'additional' = 'general'; // new variable
    export let feature_names: TFeatureName[];
    import TooltipIcon from './TooltipIcon.svelte';
    import type {TFeatureName} from '$lib/types';
    
    let additionalInfoName = "Ergänzende Informationen";

    // Normalize a string by removing spaces and converting to lower case for comparison
    function normalizeString(str: string): string {
        return str.replace(/\s+/g, '').toLowerCase();
    }

    let normalizedFeatureTooltips = Object.keys(feature_tooltips).reduce((acc, key) => {
        const normalizedKey = normalizeString(key); // Use your existing normalizeString function
        acc[normalizedKey] = feature_tooltips[key];
        return acc;
    }, {});

    let normalizedFeatureUnits = Object.keys(feature_units).reduce((acc, key) => {
        const normalizedKey = normalizeString(key); // Use your existing normalizeString function
        acc[normalizedKey] = feature_units[key];
        return acc;
    }, {});

</script>

<!-- Tabs go *outside* the table -->
<div class="tab-buttons">
    <button
            on:click={() => (activeTab = 'general')}
            class:active={activeTab === 'general'}
    >
        Modellattribute
    </button>
    <button
            on:click={() => (activeTab = 'additional')}
            class:active={activeTab === 'additional'}
    >
        Weitere Infos
    </button>
</div>
<div class="table-container w-[90%] mx-auto">
    <table class="table table-hover">
        <colgroup>
            <col style="width: 60%;"/>
            <col style="width: 40%;"/>
        </colgroup>
        <thead></thead>
        <tbody>
        {#each grouped_data as group}
            {#if (group.title !== additionalInfoName && activeTab === 'general')
            || (group.title === additionalInfoName && activeTab === 'additional')}

                <tr class="group-title">
                    <td colspan={header.length}>
                        <strong>{group.title}</strong>
                    </td>
                </tr>

                {#each group.items as row}
                    <tr class="{row[1].includes('Current:') ? 'highlighted' : ''}">
                        <td>
                            {#if group.title === additionalInfoName}
                                <span>{row[0]}</span>
                            {:else}
                                <span>{row[0].includes(';') ? row[0].split(';')[1] : row[0]}</span>
                            {/if}
                            {#if normalizedFeatureTooltips[normalizeString(row[0])]}
                                <TooltipIcon
                                        class="tooltipIcon"
                                        message={normalizedFeatureTooltips[normalizeString(row[0])]}/>
                            {/if}
                        </td>
                        <td>
                            {#if row[1].includes('Current:')}
                                {@html row[1].replace(/Current: ([^,]+), Old: (.+)/, (m, c, o) => `<strong>${c}</strong> <s>${o}</s>`)}
                            {:else}
                                <span>{row[1]}</span>
                            {/if}
                            {#if normalizedFeatureUnits[normalizeString(row[0])]}
                                <span> {normalizedFeatureUnits[normalizeString(row[0])]}</span>
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
        position: relative;
        word-break: break-word; /* Break long words */
    }

    .table tbody td:first-child {
        width: 30%; /* Left column takes 70% */
        text-align: left; /* Align text to the left */
    }

    .table tbody td:last-child {
        width: 70%; /* Right column takes 30% */
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
        font-size: 0.9rem;
        text-align: right; /* Switch to right alignment */
    }

    .tab-buttons {
        width: 90%; /* match table width */
        margin: 0.5rem auto; /* less vertical spacing */
        display: flex;
        gap: 0.3rem; /* smaller gap between buttons */
    }

    .tab-buttons button {
        flex: 1; /* evenly spread buttons */
        background: #f2f2f2;
        border: 1px solid #ccc;
        border-radius: 3px; /* slight rounding */
        padding: 0.3rem 0.4rem; /* slimmer padding */
        cursor: pointer;
        transition: background-color 0.3s;
        text-align: center;
    }

    .tab-buttons button:hover {
        background-color: #ddd;
    }

    .tab-buttons button.active {
        background-color: #ddd;
        font-weight: bold;
    }
</style>