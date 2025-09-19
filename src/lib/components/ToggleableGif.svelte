<script lang="ts">
	export let src: string;
	export let alt: string;
	export let smallSize: string = '35vw'; // Default small size
	export let largeSize: string = '85vw'; // Default large size

	let isLarge = false;

	function toggleSize() {
		isLarge = !isLarge;
	}
</script>

<img
	{alt}
	{src}
	style="width: {isLarge ? largeSize : smallSize}; cursor: pointer; transition: width 0.3s ease;"
	on:click={toggleSize}
	on:keydown={(e) => e.key === 'Enter' && toggleSize()}
	tabindex="0"
	role="button"
	aria-label="Click to toggle image size"
/>

<style>
	img:focus {
		outline: 2px solid #007acc;
		outline-offset: 2px;
	}
</style>
