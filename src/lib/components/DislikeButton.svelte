<script lang="ts">
    import like from '$lib/assets/like.png';
    import {createEventDispatcher} from 'svelte';
    import '../../global.css';
    import Modal from "$lib/components/Modal.svelte";
    import type {TChatMessage} from "$lib/types";

    export let message: TChatMessage;

    let showModal = false;
    let userInput = '';
    const dispatch = createEventDispatcher();

    function handleDislike() {
        showModal = !showModal;
    }

    function handleModalClose() {
        dispatch('feedbackButtonClick', {buttonType: 'dislike', messageId: message.id, user_comment: userInput});
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<img class="mr-2.5 mt-2 rotate-180 clickable" src={like} alt="" width="18" height="15" on:click={handleDislike}/>
<Modal type={"negative"} showModal={showModal} bind:userInput={userInput} on:close={handleModalClose}/>
