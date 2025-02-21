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

    function handleLike() {
        showModal = !showModal;
    }

    function handleModalClose() {
        dispatch('feedbackButtonClick', {buttonType: 'like', messageId: message.id, user_comment: userInput});
    }

</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<img class="mr-2.5 mt-2 clickable" src={like} alt="" width="18" height="15" on:click={handleLike}/>
<Modal type={"positive"} showModal={showModal} bind:userInput={userInput} on:close={handleModalClose}/>