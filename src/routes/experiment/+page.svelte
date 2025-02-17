<script lang="ts">
    import TTMDatapoint from '$lib/components/TTM-Experiment-Datapoint.svelte';
    import TTMChat from '$lib/components/TTM-Chat.svelte';
    import TTMQuestions from '$lib/components/TTM-Questions.svelte';
    import type {
        TDatapoint,
        TQuestionResult,
        TTestOrTeaching,
        StaticReport, TDatapointResult, TChatMessage, TGeneralQuestion, TFeatureQuestion
    } from '$lib/types';
    import backend from '$lib/backend';
    import {fade} from 'svelte/transition';
    import type {PageData} from '../';
    import { env } from '$env/dynamic/public';
    const PUBLIC_TEACH_TEST_CYCLES = env.PUBLIC_TEACH_TEST_CYCLES;
    const PUBLIC_END_TEST_CYCLES = env.PUBLIC_END_TEST_CYCLES;

    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import StaticExplanationReport from '$lib/components/StaticExplanationReport.svelte';
    import {writable} from "svelte/store";
    import SelfEvalPopup from '$lib/components/Self-Evaluation-Popup.svelte';
    import QuestionRankingPopup from '$lib/components/QuestionRanking-Popup.svelte';
    import IntroDonePopup from '$lib/components/Intro-Done-Popup.svelte';
    import Spinner from '$lib/components/Spinner.svelte';

    /**
     * Data provided by the `+page.ts` load function in the same folder
     */
    export let data: PageData;
    export const selfAssesmentPopupVisible = writable(false);
    export const introPopupVisible = writable(false);

    export const questionRankingDone = writable(false);

    //-----------------------------------------------------------------

    selfAssesmentPopupVisible.subscribe(value => {
        $selfAssesmentPopupVisible = value;
    });

    introPopupVisible.subscribe(value => {
        $introPopupVisible = value;
    });

    function handleRankingDone() {
        questionRankingDone.set(true);
    }

    function handleConfirm() {
        selfAssesmentPopupVisible.set(false);
        introPopupVisible.set(false);
    }

    /**
     * Datapoint relevant
     */
    let current_datapoint: TDatapoint = data.datapoint;
    let current_prediction: string = data.datapoint.current_prediction;
    let datapoint_count = 1;
    let datapoint_answer_selected: string | null = null;
    let feature_tooltips = data.feature_tooltips;
    let feature_units = data.feature_units;
    let prediction_choices = data.prediction_choices;
    let user_study_task_description = data.user_study_task_description;

    //-----------------------------------------------------------------

    /**
     * Chat relevant
     */
    let messages: TChatMessage[] = [];

    let isLoading = false;
    let handlingNext = false;

    //-----------------------------------------------------------------

    /**
     * Test relevant
     */
    let cycles_completed = 0;
    let transition_done: boolean;
    //-----------------------------------------------------------------
    /**
     * Static Report relevant
     */
    let static_report: StaticReport = data.static_report;
    //-----------------------------------------------------------------

    let {feature_questions, general_questions}: TQuestionResult = data.questions;
    let feature_names = data.feature_names;
    let user_id: string = data.user_id;
    let study_group = data.study_group;
    let experiment_phase: TTestOrTeaching = 'intro-test';

    // Information that should not be shown to the user
    let true_label: string = data.datapoint.true_label;
    let ml_label_prediction: string = data.datapoint.ml_prediction;
    delete data.datapoint.true_label;
    delete data.datapoint.ml_prediction;
    let new_datapoint: TDatapoint;
    let just_used_proceeding_stop = false;

    function get_feature_id_from_name(featureName, feature_names) {
        // Normalize the feature name by removing spaces and converting to lower case
        const normalizedFeatureName = featureName.replace(/\s+/g, '').toLowerCase();

        // Find the feature in the array, normalizing the feature_name in the same way
        const foundFeature = feature_names.find(f => f.feature_name.replace(/\s+/g, '').toLowerCase() === normalizedFeatureName);

        // Return the id or null if not found
        return foundFeature ? foundFeature.id : null;
    }


    function createAndPushMessage(text: string,
                                  isUser: boolean,
                                  feedback: boolean,
                                  question_id: string,
                                  feature_id?: number,
                                  followup?: (TGeneralQuestion | TFeatureQuestion)[]) {
        let message_id = crypto.randomUUID();
        messages.push(<TChatMessage>{
            id: message_id,
            text: text,
            isUser: isUser,
            feedback: feedback,
            question_id: question_id,
            feature_id: feature_id,
            followup: followup
        });
        messages = [...messages]; // Creates a new reference
    }

    function pushMessage(message: TChatMessage) {
        let message_id = crypto.randomUUID();
        message.id = message_id;
        messages = [...messages, message]; // Creates a new reference
    }

    export async function submitQuestion(e: any) {
        // Get Information
        let questionId: string = e.detail.questionId;
        let featureName: string = e.detail.feature;
        let full_question: string = e.detail.question;

        // Get correct question id and feature id
        let generalQuestion = general_questions.find(q => q.q_id === questionId);
        let featureQuestion = feature_questions.find(q => q.q_id === questionId);


        // Set full_question to empty string if not found
        if (full_question.length === 0) {
            full_question = '';
        }

        // get feature id by feature name
        let feature_id = featureQuestion ? get_feature_id_from_name(featureName, feature_names) : null;

        // if feature id is not found, make feature name to int and assign to id
        if (!feature_id && featureQuestion) {
            feature_id = parseInt(featureName);
            // Then get feature name by feature id
            featureName = feature_names.find(f => f.id === feature_id).feature_name;
        }

        // Create full question to log and show to user
        if (generalQuestion) {
            full_question = generalQuestion.question.replace('[current prediction]', '<b>' + current_prediction + '</b>');
        } else if (featureQuestion && featureName) {
            full_question = featureQuestion.question.replace('[feature selection]', '<b>' + featureName + '</b>');
        }

        // Log and show
        if (full_question) {
            const details = {
                datapoint_count: datapoint_count,
                question: full_question,
                question_id: questionId
            };
            fetch(`${base}/api/log_event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    event_source: 'teaching',
                    event_type: 'question',
                    details: details,
                })
            });

            // Push user question to chat
            createAndPushMessage(full_question, true, false, questionId);

            let responseMessage: TChatMessage;
            setTimeout(async () => {
                await backend.xai(user_id).get_question_selection_response(questionId, feature_id)
                    .then(response => response.json())
                    .then(data => {
                        responseMessage = data;
                    });
                pushMessage(responseMessage);
            }, 700);
        } else {
            console.error('Question not found');
        }
    }

    async function submitWrittenQuestion(e: any) {
        const user_message = e.detail.message;
        createAndPushMessage(user_message, true, false, "0");
        let question_id;
        let feature_id;
        let responseData;

        // Get Response
        setTimeout(async () => {
            await backend.xai(user_id).get_user_message_response(user_message)
                .then(response => response.json())
                .then(data => {
                    responseData = data;
                });
            pushMessage(responseData);
            question_id = responseData.question_id;
            feature_id = responseData.feature_id;

            // Log event
            const details = {
                datapoint_count: datapoint_count,
                user_question: user_message,
                message: responseData,
                question_id: question_id,
                feature_id: feature_id,
            };
            fetch(`${base}/api/log_event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    event_source: 'teaching',
                    event_type: 'question',
                    details: details,
                })
            });
        }, 700);
    }

    async function handleNext(e: any) {
        // Check if clicked twice
        if (handlingNext) {
            return;
        }

        // Check if enough questions were asked and suggest some questions.
        // only if study_group is chat
        if (study_group === 'chat' && experiment_phase === 'teaching' && !just_used_proceeding_stop) {
            let result = await (await backend.xai(user_id).get_proceeding_okay()).json() as {
                proceeding_okay: boolean,
                message: TChatMessage,
            };
            if (!result.proceeding_okay) {
                // Send message to user stating that they need to ask more questions and include follow-up questions
                pushMessage(result.message);
                just_used_proceeding_stop = true;
                // log event
                const details = {
                    datapoint_count: datapoint_count,
                    message: result.message,
                };
                fetch(`${base}/api/log_event`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        event_source: 'teaching',
                        event_type: 'proceeding_stop',
                        details: details,
                    })
                });
                return;
            }
        }

        handlingNext = true;
        just_used_proceeding_stop = false;
        transition_done = false;
        let next_phase = experiment_phase;
        if (experiment_phase !== 'teaching') {
            datapoint_count++;
            cycles_completed++;
        }

        // Check if intro is over. Intro test has same number of cycles as end test
        if (experiment_phase === 'intro-test' && datapoint_count > parseInt(PUBLIC_END_TEST_CYCLES)) {
            // After completing pre-test, switch to teaching
            cycles_completed = 0; // Reset for teaching cycle
            datapoint_count = 1; // Reset for teaching cycle
            next_phase = 'teaching';
            transition_done = true;
            introPopupVisible.set(true);
        }

        // Check if all cycles (teach-test cycles + end-test cycles) are completed
        if (cycles_completed >= parseInt(PUBLIC_TEACH_TEST_CYCLES) + parseInt(PUBLIC_END_TEST_CYCLES)) {
            goto(`${base}/exit?user_id=${user_id}&sg=${study_group}`);
            return;
        }

        if (experiment_phase === 'test') {
            if (cycles_completed == parseInt(PUBLIC_TEACH_TEST_CYCLES)) {
                // If teach-test cycles are complete, move to final-test
                selfAssesmentPopupVisible.set(true);
                next_phase = 'final-test';
                datapoint_count = 1; // Reset datapoint count for final-test phase
                transition_done = true;
            } else {
                // Switch to teaching after a test, if not yet completed all teach-test cycles
                next_phase = 'teaching';
                transition_done = true;
            }
        } else if (experiment_phase === 'teaching' && !transition_done) {
            // After teaching, if not coming from test_intro, always switch to testing in the next cycle
            next_phase = 'test';
        }

        // Fetch the appropriate datapoint based on the current phase
        await getDatapoint(next_phase);
        setNewCurrentDatapoint();
        experiment_phase = next_phase;
        logNextEvent();
        isLoading = false;
        handlingNext = false;
    }

    async function getDatapoint(type: TTestOrTeaching) {
        let endpoint = '';
        switch (type) {
            case 'intro-test':
                endpoint = 'get_intro_test_datapoint';
                break;
            case 'teaching':
                endpoint = 'get_train_datapoint';
                break;
            case 'test':
                endpoint = 'get_test_datapoint';
                break;
            case 'final-test':
                endpoint = 'get_final_test_datapoint';
                break;
        }

        if (type === 'teaching') {
            let result = await (await backend.xai(user_id).get_train_datapoint(datapoint_count)).json() as TDatapointResult;
            current_prediction = result.current_prediction;
            static_report = result.static_report;
            new_datapoint = result;
        } else {
            ({current_prediction, ...new_datapoint} = await (
                await backend.xai(user_id)[endpoint](datapoint_count)
            ).json());
        }
    }

    function setNewCurrentDatapoint() {
        messages = [];
        true_label = <string>new_datapoint.true_label;
        ml_label_prediction = <string>new_datapoint.ml_prediction;
        delete new_datapoint.true_label;
        delete new_datapoint.ml_prediction;
        current_datapoint = new_datapoint;
        datapoint_answer_selected = null; // Reset selected answer
    }

    async function setUserPrediction(event) {
        try {
            const response = await backend.xai(user_id).set_user_prediction(
                experiment_phase,
                datapoint_count,
                event.detail.user_prediction);
            const data = await response.json();

            // Only push a message if "initial_message" exists in the response
            if (data.initial_message) {
                pushMessage(data.initial_message);
            }
        } catch (error) {
            console.error("Error setting user prediction:", error);
        }
    }

    function logNextEvent() {
        const details = {datapoint_count_new: datapoint_count};
        fetch(`${base}/api/log_event`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user_id, event_source: experiment_phase, event_type: 'handleNext', details})
        });
    }


    function handleFeedbackButtonClick(event) {
        const {buttonType} = event.detail;
        const {messageId} = event.detail;
        const {user_comment} = event.detail;
        const details = {
            datapoint_count: datapoint_count,
            buttonType: buttonType,
            question_id: messageId,
            user_comment: user_comment
        };
        fetch(`${base}/api/log_event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user_id,
                event_source: 'teaching',
                event_type: 'feedback',
                details: details,
            })
        });
    }

    async function handleClicked() {
        // Set loading state to true immediately upon click
        isLoading = true;
    }
</script>


{#if $introPopupVisible}
    <IntroDonePopup {user_id} {feature_questions} {general_questions} {study_group} {user_study_task_description}
                    on:confirm={handleConfirm}/>
{:else if $selfAssesmentPopupVisible}
    {#if $questionRankingDone}
        <SelfEvalPopup {user_id} {feature_questions} {general_questions} {study_group} on:confirm={handleConfirm}/>
    {:else}
        <QuestionRankingPopup {user_id} {feature_questions} {general_questions} {study_group}
                              on:confirm={handleRankingDone}/>
    {/if}
{:else}
    {#if isLoading}
        <Spinner/>
    {/if}
    <div class={experiment_phase === 'teaching' ? "col-start-1 col-end-2" : "col-start-2 col-end-3"}>
        <TTMDatapoint
                datapoint={current_datapoint}
                feature_tooltips={feature_tooltips}
                bind:selected_prediction={datapoint_answer_selected}
                bind:datapoint_count
                experimentPhase={experiment_phase}
                feature_names={feature_names}
                feature_units={feature_units}
                interactiveOrStatic={study_group}
                user_id={user_id}
                instance_prediction={ml_label_prediction}
                prediction_choices={prediction_choices}
                on:next={handleNext}
                on:clicked={handleClicked}
                on:user_predicted={setUserPrediction}
        />
    </div>
    {#if datapoint_answer_selected}
        {#if experiment_phase === 'teaching'}
            {#if study_group === 'static'}
                <div
                        class="col-start-2 col-end-4 overflow-y-scroll"
                        transition:fade={{ delay: 250, duration: 500 }}
                >
                    <StaticExplanationReport
                            static_report={static_report}
                            instance_prediction={ml_label_prediction}
                            on:next={handleNext}
                    />
                </div>
            {:else if study_group === 'chat'}
                <div
                        class="col-start-2 col-end-4 overflow-y-scroll"
                        transition:fade={{ delay: 250, duration: 500 }}
                >
                    <TTMChat {messages} {study_group} user_input={true}
                             on:feedbackButtonClick={handleFeedbackButtonClick}
                             on:submit={submitWrittenQuestion}
                             on:next={handleNext}
                             on:questionClick={submitQuestion}
                    />
                </div>
            {:else}
                <div
                        class="col-start-2 col-end-3 overflow-y-scroll"
                        transition:fade={{ delay: 250, duration: 500 }}
                >
                    <TTMChat {messages} {study_group} user_input={false}
                             on:feedbackButtonClick={handleFeedbackButtonClick}
                             on:submit={submitWrittenQuestion}
                             on:next={handleNext}
                             on:questionClick={submitQuestion}
                    />
                </div>
                <div class="col-start-3 col-end-4"
                     transition:fade={{ delay: 250, duration: 500 }}>
                    <TTMQuestions
                            {feature_questions}
                            {general_questions}
                            {current_prediction}
                            feature_questions_dropdown={feature_names}
                            on:submit={submitQuestion}
                            on:next={handleNext}
                    />
                </div>
            {/if}
        {/if}
    {/if}
{/if}

