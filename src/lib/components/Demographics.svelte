<script lang="ts">
	import { userDemographics } from '$lib/stores';
	import { env } from '$env/dynamic/public';
	import { currentUserId } from '$lib/stores';
	import backend from '$lib/backend';

	let openCategories: { [key: string]: boolean } = {};
	
	// Check if the panel should be shown
	const showPanel = env.PUBLIC_SHOW_USER_MODEL_PANEL === 'true';
	
	// Debug user id store
	$: console.log('currentUserId store value:', $currentUserId);

	const mlLevels = ["low", "medium", "high"];
	const cognitiveStates = ["active", "interactive", "constructive"];
	let selectedMlIndex: number = 0;
	let selectedCognitiveIndex: number = 0;
	let lastMlIndex: number = -1;
	let lastCognitiveIndex: number = -1;

	function toggleCategory(category: string) {
		openCategories[category] = !openCategories[category];
	}

	// Initialize default states - always show both sliders as open
	$: {
		if (openCategories['ml_knowledge'] === undefined) {
			openCategories['ml_knowledge'] = true;
		}
		if (openCategories['cognitive_state'] === undefined) {
			openCategories['cognitive_state'] = true;
		}
		
		// Initialize from backend data if available
		if ($userDemographics) {
			const ml = $userDemographics["ml_knowledge"];
			if (typeof ml === 'string') {
				const idx = mlLevels.indexOf(ml);
				if (idx >= 0) {
					selectedMlIndex = idx;
					lastMlIndex = selectedMlIndex;
				}
			}
			
			const cognitive = $userDemographics["cognitive_state"];
			if (typeof cognitive === 'string') {
				const idx = cognitiveStates.indexOf(cognitive);
				if (idx >= 0) {
					selectedCognitiveIndex = idx;
					lastCognitiveIndex = selectedCognitiveIndex;
				}
			}
		}
	}

	function onMlSliderInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const newIndex = parseInt(input.value);
		console.log('ML Slider input detected:', newIndex, 'label:', mlLevels[newIndex]);
		
		selectedMlIndex = newIndex;
		
		// update store value so label under section updates immediately
		if ($userDemographics) {
			const updated = { ...$userDemographics } as any;
			updated["ml_knowledge"] = mlLevels[newIndex];
			userDemographics.set(updated);
		}
		
		// Call backend with both values
		updateBackend();
	}
	
	function onCognitiveSliderInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const newIndex = parseInt(input.value);
		console.log('Cognitive Slider input detected:', newIndex, 'label:', cognitiveStates[newIndex]);
		
		selectedCognitiveIndex = newIndex;
		
		// update store value so label under section updates immediately
		if ($userDemographics) {
			const updated = { ...$userDemographics } as any;
			updated["cognitive_state"] = cognitiveStates[newIndex];
			userDemographics.set(updated);
		}
		
		// Call backend with both values
		updateBackend();
	}
	
	function updateBackend() {
		const uid = $currentUserId;
		if (uid && uid.trim()) {
			const mlValue = mlLevels[selectedMlIndex];
			const cognitiveValue = cognitiveStates[selectedCognitiveIndex];
			console.log('Calling backend with user_id:', uid, 'ml_knowledge:', mlValue, 'cognitive_state:', cognitiveValue);
			
			backend.xai(uid).update_user_model(mlValue, cognitiveValue)
				.then(response => {
					console.log('Backend response status:', response.status);
					return response.json();
				})
				.then(data => {
					console.log('Backend response data:', data);
				})
				.catch((e) => {
					console.error('Failed to update user model', e);
				});
		} else {
			console.error('No user_id in store, cannot call backend');
		}
	}
</script>

{#if showPanel}
<div class="demographics-container">
	<div class="header">
		<div class="confidence-container">
			<span class="icon">ℹ️</span>
			<h4 class="title">Control of Conversational AI</h4>
		</div>
		<div class="confidence-slider-legend">
			<span class="confidence-value">0%</span>
			<div class="confidence-bar"></div>
			<span class="confidence-label">Confidence</span>
			<div class="confidence-bar-green"></div>
			<span class="confidence-value">100%</span>
		</div>
	</div>

	<!-- ML Knowledge Slider -->
	<div class="demographic-item">
		<div class="item-header" role="button" tabindex="0" on:click={() => toggleCategory('ml_knowledge')} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCategory('ml_knowledge')}>
			<h5>ML Knowledge</h5>
			<button class="toggle-button">{openCategories['ml_knowledge'] ? '⌄' : '›'}</button>
		</div>
		{#if openCategories['ml_knowledge'] !== false}
			<div class="slider-container">
				<div class="slider-labels">
					<span class="label">{mlLevels[selectedMlIndex]}</span>
				</div>
				<div class="ml-slider-wrapper">
					<input type="range" min="0" max="2" step="1" value={selectedMlIndex} on:input={onMlSliderInput} on:change={onMlSliderInput} />
					<div class="ml-ticks">
						{#each mlLevels as lvl, i}
							<span class="tick {selectedMlIndex === i ? 'active' : ''}">{lvl}</span>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Cognitive State Slider -->
	<div class="demographic-item">
		<div class="item-header" role="button" tabindex="0" on:click={() => toggleCategory('cognitive_state')} on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleCategory('cognitive_state')}>
			<h5>Cognitive State</h5>
			<button class="toggle-button">{openCategories['cognitive_state'] ? '⌄' : '›'}</button>
		</div>
		{#if openCategories['cognitive_state'] !== false}
			<div class="slider-container">
				<div class="slider-labels">
					<span class="label">{cognitiveStates[selectedCognitiveIndex]}</span>
				</div>
				<div class="ml-slider-wrapper">
					<input type="range" min="0" max="2" step="1" value={selectedCognitiveIndex} on:input={onCognitiveSliderInput} on:change={onCognitiveSliderInput} />
					<div class="ml-ticks">
						{#each cognitiveStates as state, i}
							<span class="tick {selectedCognitiveIndex === i ? 'active' : ''}">{state}</span>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
{/if}

<style lang="postcss">
	.demographics-container {
		background-color: #ffffff !important;
		border-radius: 8px;
		padding: 0;
		margin-top: 1rem;
		border: 1px solid #e5e7eb;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	}
	.demographics-container .header {
		display: flex;
		flex-direction: column;
		margin-bottom: 0;
		padding: 16px;
		background-color: #f8fafc !important;
		border-bottom: 1px solid #e5e7eb;
		border-radius: 8px 8px 0 0;
	}
	.confidence-container {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.title {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1f2937;
	}
	.confidence-slider-legend {
		display: flex;
		align-items: center;
		width: 100%;
		font-size: 0.8rem;
		color: #6b7280;
	}
	.confidence-bar, .confidence-bar-green {
		flex-grow: 1;
		height: 4px;
	}
    .confidence-bar {
		background-color: #d1d5db;
	}
	.confidence-bar-green {
		background: linear-gradient(to right, #d1d5db, #bec4d7);
	}
	.confidence-label {
		margin: 0 8px;
		font-weight: 500;
	}

	.demographics-container .demographic-item {
		margin-bottom: 0;
		border-bottom: 1px solid #e5e7eb;
		background-color: #ffffff !important;
	}
	.demographics-container .demographic-item:last-child {
		border-bottom: none;
	}
	.demographics-container .item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		padding: 12px 16px;
		background-color: #f1f5f9 !important;
		border-bottom: 1px solid #e5e7eb;
	}
	.demographics-container .item-header:hover {
		background-color: #e2e8f0 !important;
	}
	h5 {
		font-size: 1rem;
		font-weight: 600;
		color: #374151;
		margin: 0;
	}
	.toggle-button {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
	}

	.demographics-container .slider-container {
		padding: 12px 16px;
		background-color: #ffffff !important;
	}
	.slider-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.9rem;
		color: #374151;
		margin-bottom: 8px;
		font-weight: 500;
	}
	.ml-slider-wrapper {
		display: flex;
		flex-direction: column;
		gap: 8px;
		position: relative;
		z-index: 10;
		overflow: visible;
	}
	.ml-slider-wrapper input[type="range"] {
		appearance: none;
		width: 100%;
		height: 20px;
		background: #e5e7eb;
		border-radius: 2px;
		outline: none;
		position: relative;
		z-index: 15;
		pointer-events: auto;
		cursor: pointer;
	}
	.ml-slider-wrapper input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: #bec4d7;
		border-radius: 50%;
		border: 1px solid #9ca3af;
		cursor: pointer;
	}
	.ml-slider-wrapper input[type="range"]::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #bec4d7;
		border: 1px solid #9ca3af;
		border-radius: 50%;
		cursor: pointer;
	}
	.ml-ticks {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 4px;
		font-size: 0.75rem;
		color: #6b7280;
		pointer-events: none;
		z-index: 1;
	}
	.ml-ticks .tick {
		text-align: center;
	}
	.ml-ticks .tick.active {
		color: #374151;
		font-weight: 600;
	}
</style> 