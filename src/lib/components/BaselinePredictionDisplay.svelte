<script lang="ts">
    import Header from './Header.svelte';
    import {createEventDispatcher} from 'svelte';
    import {fade} from 'svelte/transition';

    export let model_prediction: string;
    export let user_prediction: string;

    const dispatch = createEventDispatcher();

    // Check if predictions match
    $: isCorrect = user_prediction === model_prediction;
    $: resultMessage = isCorrect 
        ? `🎉 You are correct! The model also predicted: ${model_prediction}`
        : `❌ You are incorrect. You predicted "${user_prediction}" but the model predicted: ${model_prediction}`;

    function handleNext() {
        dispatch('next');
    }
</script>

<div 
    class="inputarea h-full flex-1 overflow-y-auto shadow-[0_15px_15px_-5px_rgba(0,0,0,0.2)] mx-1.5 my-0"
    transition:fade={{ delay: 250, duration: 500 }}
>
    <Header>Model Prediction</Header>
    
    <div class="content-align">
        <div class="prediction-display">
            <h2 style="text-align: center; margin-bottom: 20px;">Results</h2>
            
            <div class="result-message" class:correct={isCorrect} class:incorrect={!isCorrect}>
                <p class="result-text">{resultMessage}</p>
            </div>
            
            <div class="next-button-container">
                <button 
                    class="btn variant-filled-primary next-button"
                    on:click={handleNext}
                >
                    Next
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
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

    .content-align {
        width: 90%;
        margin: 0 auto;
        padding: 20px;
    }

    .prediction-display {
        text-align: center;
    }

    .result-message {
        margin: 30px auto;
        padding: 25px;
        border-radius: 12px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .result-message.correct {
        background: linear-gradient(135deg, #d4edda, #c3e6cb);
        border: 2px solid #28a745;
    }

    .result-message.incorrect {
        background: linear-gradient(135deg, #f8d7da, #f5c6cb);
        border: 2px solid #dc3545;
    }

    .result-text {
        font-size: 1.3em;
        font-weight: 600;
        margin: 0;
        line-height: 1.4;
    }

    .correct .result-text {
        color: #155724;
    }

    .incorrect .result-text {
        color: #721c24;
    }

    .next-button-container {
        margin-top: 30px;
    }

    .next-button {
        padding: 12px 24px;
        font-size: 1.1em;
    }
</style>