<script lang="ts">
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
    let selectedQuartier = "";

    async function handleQuartierChange(event) {
        selectedQuartier = event.target.value;
        dispatch('quartierChange', {selectedQuartier});
    }

</script>

<div class="inputarea">
    <Header>Übersicht</Header>

    <div class="select-container">
        <label for="quartier-select" class="select-label">Quartier</label>
        <select id="quartier-select" bind:value={selectedQuartier} on:change={handleQuartierChange}
                class="select-dropdown">
            <option value="" disabled selected>Suchen ...</option>
            {#each wohnquartiere.wohnquartiere as quartier}
                <option value={quartier}>{quartier}</option>
            {/each}
        </select>
    </div>

    <main class="main-content">
        <Datapoint
                header={['Attribute', 'Value']}
                grouped_data={data.displayable_features}
                feature_tooltips={feature_tooltips}
                feature_units={feature_units}
                feature_names={feature_names}
        />
    </main>

    <div class="map-container">
        <iframe
                src="{base}/colored_kgs_map_with_click.html"
                width="100%"
                height="100%"
                allowfullscreen
        ></iframe>
    </div>

    {#if prediction_probability && prediction_probability.length > 0}
        <div class="prediction-container">
            <h2 class="prediction-title">Prediction Probabilities</h2>
            {#each prediction_probability as {label, probability}}
                <div class="prediction-item">
                    <p class="prediction-label">{label}</p>
                    <progress class="prediction-progress" value={probability * 100} max="100"></progress>
                    <p class="prediction-value">{probability}</p>
                </div>
                <hr>
            {/each}
        </div>
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

    .select-label {
        font-size: 1.1rem;
        font-weight: bold;
        color: var(--text-color, #333);
    }

    .select-dropdown {
        flex-grow: 1;
        padding: 0.3rem;
        font-size: 1rem;
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
</style>