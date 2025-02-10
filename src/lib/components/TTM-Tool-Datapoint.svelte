<script lang="ts">
    import Select from 'svelte-select';
    import Datapoint from './Datapoint.svelte';
    import Header from "$lib/components/Header.svelte";
    import type {PredictionProbability} from "$lib/types";
    import '$lib/../global.css';
    import {base} from '$app/paths';
    import {createEventDispatcher} from "svelte";

    export let feature_names;
    export let feature_tooltips: { [key: string]: string };
    export let data: { title: string; items: [string, string][] }[];
    export let feature_units: { [key: string]: string };
    export let wohnquartiere: { wohnquartiere: number[] };
    export let prediction_probability: PredictionProbability[];

    const dispatch = createEventDispatcher();
    let selectedQuartier: { label: string; value: string } | null = null;

    const options = wohnquartiere.wohnquartiere.map(num => ({
        label: String(num),
        value: String(num) // Ensures the value is a string
    }));

    // **Updated handleChange Function**
    let activeTab: 'map' | 'instance' = 'map';

    // When a search is performed (handleChange is triggered),
    // switch to the instance tab automatically.
    function handleChange(event: CustomEvent<{ label: string; value: string } | null>) {
        const selected = event.detail;
        if (selected) {
            selectedQuartier = selected;
            dispatch('quartierChange', {selectedQuartier: selectedQuartier.value});
            activeTab = 'instance'; // Switch to instance tab
        } else {
            selectedQuartier = null;
            dispatch('quartierChange', {selectedQuartier: null});
        }
    }

    // **Updated handle_focus Function**
    function handle_focus() {
        selectedQuartier = null; // Clear the current selection
    }
</script>


<!-- Tab navigation buttons -->
<div class="inputarea">
    <Header>
        <p>Wohnquartiere</p>
    </Header>
    <div class="tab-buttons">
        <button
                on:click={() => activeTab = 'map'}
                class:active={activeTab === 'map'}
        >
            Karte
        </button>
        <button
                on:click={() => activeTab = 'instance'}
                class:active={activeTab === 'instance'}
        >
            Wohnquartier
        </button>
    </div>

    {#if activeTab === 'map'}
        <div class="map-container">
            <iframe
                    src="{base}/map_D.html"
                    width="100%"
                    height="100%"
                    allowfullscreen
            ></iframe>
        </div>

        <div class="select-container">
            <Select
                    items={options}
                    bind:value={selectedQuartier}
                    on:change={handleChange}
                    on:focus={handle_focus}
                    placeholder="KGS suchen..."
                    searchable
                    clearable
            />
        </div>
    {/if}

    {#if activeTab === 'instance'}
        <main class="main-content">
            <Datapoint
                    header={['Attribute', 'Value']}
                    grouped_data={data.displayable_features}
                    feature_tooltips={feature_tooltips}
                    feature_units={feature_units}
                    feature_names={feature_names}
            />
        </main>
    {/if}
</div>

<style lang="postcss">
    .inputarea {
        background: var(--questions-bg);
        min-height: 97vh;
        max-height: 97vh;
    }

    .select-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1rem 0;
        padding-right: 1rem;
        padding-left: 1rem;
    }


    .main-content {
        flex: 1;
        margin: 1rem 0;
    }

    .map-container {
        width: 90%;
        margin: 1rem auto;
        border: 1px solid #ccc;
        border-radius: 5px;
        overflow: hidden;
        height: 35vh;
    }

    /* Responsive Adjustments */
    .inputarea {
        background: var(--questions-bg);
        min-height: 97vh;
        max-height: 97vh;
    }

    @media (max-width: 600px) {
        .inputarea {
            min-height: 90vh;
            max-height: 90vh;
        }
    }

    @media (min-width: 601px) and (max-width: 900px) {
        .inputarea {
            min-height: 95vh;
            max-height: 95vh;
        }
    }

    progress::-webkit-progress-value {
        background-color: green;
    }

    progress::-moz-progress-bar {
        background-color: green;
    }

    .tab-buttons {
        display: flex;
        border-bottom: 1px solid #ccc;
        margin: 1rem 0;
    }

    .tab-buttons button {
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: border-color 0.2s ease;
    }

    .tab-buttons button:hover {
        background-color: #eee;
    }

    .tab-buttons button.active {
        font-weight: bold;
        border-bottom-color: #007bff; /* your highlight color */
    }
</style>