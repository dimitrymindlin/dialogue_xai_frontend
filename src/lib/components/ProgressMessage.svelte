<script lang="ts">
    import {onMount, onDestroy} from 'svelte';
    import {typewriter} from '$lib/typewriter';
    import LoadingCircle from '$lib/components/LoadingCircle.svelte';

    // Define the list of progress labels.
    const states = ['...'];

    let currentStateIndex = 0;
    let currentState = states[currentStateIndex];

    // Reference to the DOM element that will display the text.
    let container: HTMLDivElement;
    // Holds the reference to the typewriter action instance.
    let typewriterAction: { update: (newSpeed: number) => void; destroy: () => void } | null = null;
    // Holds the interval ID for cycling states.
    let stateInterval: ReturnType<typeof setInterval>;

    /**
     * Initializes the typewriter effect.
     * The typewriter action will read the container's innerHTML,
     * clear it, and then type the text word-by-word.
     */
    function startTypewriter() {
        if (container) {
            // Set the container content to the current progress state.
            container.innerHTML = currentState;
            // Run the typewriter effect on the container.
            typewriterAction = typewriter(container, 80);
        }
    }

    /**
     * Advances to the next progress state.
     * The current typewriter action is destroyed before re-initializing.
     */
    function nextState() {
        currentStateIndex = (currentStateIndex + 1) % states.length;
        currentState = states[currentStateIndex];
        if (typewriterAction) {
            typewriterAction.destroy();
            typewriterAction = null;
        }
        startTypewriter();
    }

    onMount(() => {
        startTypewriter();
        // Change to the next state every 2 seconds.
        stateInterval = setInterval(nextState, 2000);
    });

    onDestroy(() => {
        if (stateInterval) clearInterval(stateInterval);
        if (typewriterAction) typewriterAction.destroy();
    });
</script>

<!-- Use the same bubble structure and styling as your non-user messages -->
<div class="flex items-end mb-2.5 left-msg">
    <div class="msg-bubble max-w-md p-2.5 rounded-2xl">
        <div class="loading-container">
            <div class="planet">
                <div class="ring"></div>
                <div class="inner-planet"></div>
            </div>
            <div bind:this={container} class="loading-text">
                <!-- The text will be inserted and animated by the typewriter action -->
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
    /* Disable Tailwind ring properties globally */
    :global(*) {
        --tw-ring-inset: 0 !important;
        --tw-ring-offset-width: 0px !important;
        --tw-ring-offset-color: #fff !important;
        --tw-ring-color: transparent !important;
        --tw-ring-offset-shadow: 0 0 #0000 !important;
        --tw-ring-shadow: 0 0 #0000 !important;
    }

    .left-msg .msg-bubble {
        @apply rounded-bl-none variant-ghost-surface;
        background: #dbdee9;
        border: 1px solid #c0c4d0;
    }

    .loading-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        position: relative;
        overflow: visible;
        padding: 4px 2px;
        min-height: 35px;
    }

    .planet {
        position: relative;
        width: 25px;
        height: 25px;
        animation: float 3s ease-in-out infinite;
        transform-origin: center center;
    }

    .inner-planet {
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            110deg,
            #063970 10%,
            #1e90ff 25%,
            #63a4ff 30%,
            #2ecc71 48%,
            #1e90ff 55%,
            #63a4ff 70%,
            #063970 90%
        );
        background-size: 250% 250%;
        border-radius: 50%;
        box-shadow: 
            inset -4px -4px 8px rgba(0, 0, 0, 0.5),
            inset 4px 4px 8px rgba(255, 255, 255, 0.3),
            0 0 5px rgba(0, 0, 0, 0.2);
        animation: 
            rotate 6s linear infinite,
            moveGradient 3s ease infinite;
    }

    .ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 35px;
        height: 35px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
    }

    .ring::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 1.5px solid transparent;
        border-top: 1.5px solid #333;
        border-right: 1.5px solid #333;
        border-radius: 50%;
        animation: spin-reverse 3s linear infinite;
    }

    .loading-text {
        color: #333;
        font-size: 14px;
        font-weight: 500;
        opacity: 1;
        padding: 2px 0;
        line-height: 1.2;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-reverse {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(-360deg);
        }
    }

    @keyframes rotate {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes moveGradient {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    @keyframes float {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
        100% {
            transform: translateY(0);
        }
    }
</style>