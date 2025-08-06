<script lang="ts">
	import { userDemographics } from '$lib/stores';
	import { env } from '$env/dynamic/public';

	let openCategories: { [key: string]: boolean } = {};
	
	// Check if the panel should be shown
	const showPanel = env.PUBLIC_SHOW_USER_MODEL_PANEL === 'true';

	function toggleCategory(category: string) {
		openCategories[category] = !openCategories[category];
	}

	$: {
		if ($userDemographics) {
			Object.keys($userDemographics).forEach(category => {
				if(openCategories[category] === undefined) {
					openCategories[category] = true; // Default to open
				}
			});
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

	{#if $userDemographics}
		{#each Object.entries($userDemographics) as [category, data]}
			<div class="demographic-item">
				<div class="item-header" on:click={() => toggleCategory(category)}>
					<h5>{category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}</h5>
					<button class="toggle-button">{openCategories[category] ? '⌄' : '›'}</button>
				</div>
				{#if openCategories[category]}
                    {#if typeof data === 'string'}
                        <div class="slider-container simple-value">
                            <span class="label">{data}</span>
                        </div>
                    {:else if data && data.main_prediction}
                        <div class="slider-container">
                            <div class="slider-labels">
                                <span class="label">{data.main_prediction.value}</span>
                                <span class="percentage">{data.main_prediction.confidence}%</span>
                            </div>
                            <div class="slider-wrapper">
                                <div class="progress-bar-background">
                                    <div
                                        class="progress-bar-foreground"
                                        style="width: {data.main_prediction.confidence}%;"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    {/if}
				{/if}
			</div>
		{/each}
	{:else}
		<p class="no-data">No demographic data available yet.</p>
	{/if}
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
	.a-icon {
		background-color: black;
		color: white;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
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
    .demographics-container .simple-value {
        padding: 12px 16px;
        font-size: 0.9rem;
        color: #374151;
        font-weight: 500;
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
	.percentage {
		color: #374151;
		font-weight: 600;
	}
	.slider-wrapper {
		position: relative;
		height: 12px;
		display: flex;
		align-items: center;
	}
	.progress-bar-background {
		position: absolute;
		height: 8px;
		width: 100%;
		background-color: #e5e7eb;
		border-radius: 4px;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
	}
	.progress-bar-foreground {
		height: 100%;
		background-color: #bec4d7;
		border-radius: 4px;
		transition: width 0.3s ease;
	}
	.no-data {
		color: #6b7280;
		text-align: center;
		padding: 40px 20px;
		background-color: #ffffff;
	}
</style> 