<script lang="ts">
    import Datapoint from './Datapoint.svelte';
    import Header from "$lib/components/Header.svelte";
    import type {PredictionProbability} from "$lib/types";
    import '$lib/../global.css';
    import Demographics from "./Demographics.svelte";

    export let feature_names;
    export let data: { [key: string]: string };
    export let feature_tooltips: { [key: string]: string };
    export let feature_units: { [key: string]: string };

    export let prediction_probability: PredictionProbability[];
</script>


<div
        class="inputarea h-full flex-1 overflow-y-auto shadow-[0_15px_15px_-5px_rgba(0,0,0,0.2)] mx-1.5 my-0"
>

    <Header>Overview</Header>


    <div class="content-align">
        <h2 style="text-align: center">Current Person</h2>
    </div>

    <main class="mb-2">
        <Datapoint
                header={['Attribute', 'Value']}
                body={Object.keys(data).map((key) => [key, data[key].toString()])}
                feature_tooltips={feature_tooltips}
                feature_units={feature_units}
                feature_names={feature_names}
        />
    </main>
    <div class="demographics-section">
        <Demographics />
    </div>
    {#if prediction_probability && prediction_probability.length > 0}
        <div class="mx-3.5">
            <h2 style="text-align: center">Prediction Probabilities</h2>
            {#each prediction_probability as {label, probability}}
                <div style="display: flex; align-items: center;">
                    <p style="margin-right: 10px;">{label}</p>
                    <progress value={Number(probability) * 100} max="100" style="flex-grow: 1;"></progress>
                    <p style="margin-left: 10px;">{probability}</p>
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
        display: flex;
        flex-direction: column;
    }

    main {
        flex-shrink: 0;
    }

    .demographics-section {
        flex-grow: 1;
        overflow-y: auto;
        padding: 0 1rem;
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

    .content-align {
        width: 90%; /* Same width as table */
        margin: 0 auto; /* To center it */
    }

    progress::-webkit-progress-value {
        background-color: green;
    }

    progress::-moz-progress-bar {
        background-color: green;
    }

</style>
