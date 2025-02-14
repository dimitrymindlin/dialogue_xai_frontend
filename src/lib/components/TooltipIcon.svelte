<script lang="ts">
    export let message = '';
</script>

<span class="tooltip-icon-container">
  <span class="tooltip-icon">?</span>
  <span class="tooltip-text">{message}</span>
</span>

<style>
    .tooltip-icon-container {
        display: inline-block;
    }

    .tooltip-icon {
        background-color: grey;
        color: #fff;
        text-align: center;
        border-radius: 50%;
        width: 15px;
        height: 15px;
        display: inline-block;
        line-height: 15px;
        cursor: help;
        font-size: 12px; /* Adjust font size if necessary */
    }

    .tooltip-text {
        visibility: hidden;
        min-width: 300px; /* Ensure a reasonable minimum width */
        max-width: 100%; /* Prevent the tooltip from exceeding the parent width */
        background-color: #555;
        color: #fff;
        text-align: left; /* Align text to the left for readability */
        border-radius: 8px;
        padding: 10px;
        position: absolute;
        z-index: 1;
        top: 125%; /* Position above the icon */
        left: 0; /* Align to the left edge of the parent (table cell) */
        right: 0; /* Stretch to the right edge of the parent */
        opacity: 0;
        transition: opacity 0.3s;
        word-wrap: break-word; /* Break long words */
        white-space: normal; /* Allow text to wrap */
        box-sizing: border-box; /* Include padding in width calculations */
    }

    .tooltip-icon-container:hover .tooltip-text {
        visibility: visible;
        opacity: 1;
    }

    .tooltip-text::after {
        content: '';
        position: absolute;
        bottom: 100%; /* Position the arrow at the top of the tooltip */
        left: 50%; /* Center the arrow */
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent #555 transparent; /* Create an upward-pointing arrow */
    }
</style>