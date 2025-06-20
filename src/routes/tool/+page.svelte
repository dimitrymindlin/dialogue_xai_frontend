<script lang="ts">
    import TTMDatapoint from '$lib/components/TTM-Tool-Datapoint.svelte';
    import TTMChat from '$lib/components/TTM-Chat.svelte';
    import TTMQuestions from '$lib/components/TTM-Questions.svelte';
    import type {
        TChatMessage,
        TDatapoint,
        TQuestionResult,
        TDatapointResult,
        TFeatureName
    } from '$lib/types';
    import backend from '$lib/backend';
    import type {PageData} from './$types';
    import {base} from '$app/paths';

    /**
     * Data provided by the `+page.ts` load function in the same folder
     */
    export let data: PageData;
    //-----------------------------------------------------------------


    /**
     * Datapoint relevant
     */
    let current_datapoint: TDatapoint = data.datapoint;
    let current_prediction: string = data.datapoint.current_prediction;
    let datapoint_count = 1;
    let datapoint_answer_selected: string | null = null;
    let feature_tooltips = data.feature_tooltips;
    let feature_units = data.feature_units;
    let prediction_probability = data.prediction_probability;
    let true_label: string = String(data.datapoint.true_label);
    let ml_label_prediction: string = String(data.datapoint.ml_prediction);
    let user_id: string = data.user_id;
    let new_datapoint: TDatapoint;
    //-----------------------------------------------------------------

    /**
     * Chat relevant
     */
    let messages: TChatMessage[] = [];
    let initial_message: TChatMessage = {
        id: "init",
        text: "The model predicts that the current datapoint is " + current_prediction + ". You can ask questions.",
        isUser: false,
        feedback: false,
        question_id: "init"
    }

    let feature_names = data.feature_names;
    let {feature_questions, general_questions}: TQuestionResult = data.questions;

    function get_feature_id_from_name(featureName: string, feature_names: TFeatureName[]) {
        // Normalize the feature name by removing spaces and converting to lower case
        const normalizedFeatureName = featureName.replace(/\s+/g, '').toLowerCase();

        // Find the feature in the array, normalizing the feature_name in the same way
        const foundFeature = feature_names.find((f: TFeatureName) => 
            f.feature_name.replace(/\s+/g, '').toLowerCase() === normalizedFeatureName
        );

        // Return the id or null if not found
        return foundFeature ? foundFeature.feature_id : null;
    }

    function createAndPushMessage(text: string,
                                  isUser: boolean,
                                  feedback: boolean,
                                  question_id: string | number,
                                  feature_id?: number,
                                  followup?: []) {
        messages.push({
            id: Date.now(),
            text: text,
            isUser: isUser,
            feedback: feedback,
            question_id: String(question_id),
            feature_id: feature_id,
            followup: followup
        } as TChatMessage);
    }

    async function submitQuestion(e: any) {
        // Get Information
        let questionId: string = e.detail.questionId;
        let featureName: string = e.detail.feature;
        let question: string = e.detail.question;

        // Get correct question id and feature id
        let generalQuestion = general_questions.find(q => q.question_id === questionId);
        let featureQuestion = feature_questions.find(q => q.question_id === questionId);

        let full_question = '';
        // Check if question is not null
        if (question) {
            full_question = question;
        } else {
            // Create full question to log and show to user
            if (generalQuestion) {
                full_question = generalQuestion.question.replace('[current prediction]', '<b>' + current_prediction + '</b>');
            } else if (featureQuestion && featureName) {
                full_question = featureQuestion.question.replace('[feature selection]', '<b>' + featureName + '</b>');
            }
        }

        // get feature id by feature name if featureName is not a number as string
        let feature_id = null;
        if (isNaN(Number(featureName))) {
            // featureName is not a number, so get feature ID by feature name
            feature_id = get_feature_id_from_name(featureName, feature_names);
        } else {
            // featureName is a number (or numeric string)
            feature_id = featureName;
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
            messages = messages;

            let responseMessage: TChatMessage;
            setTimeout(async () => {
                await backend.xai(user_id).get_question_selection_response(questionId, feature_id || '')
                    .then(response => response.json())
                    .then(data => {
                        responseMessage = data;
                    });
                messages.push(responseMessage);
                messages = messages;
            }, 700);
        } else {
            console.error('Question not found');
        }
    }

    async function handleStreamComplete(e: any) {
        const { message, response } = e.detail;
        
        // Log event
        const details = {
            datapoint_count: datapoint_count,
            user_question: message,
            message: response,
            question_id: response.question_id,
            feature_id: response.feature_id,
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
    }


    function setNewCurrentDatapoint() {
        messages = [initial_message];
        if (new_datapoint) {
            true_label = String(new_datapoint.true_label);
            ml_label_prediction = String(new_datapoint.ml_prediction);
            // Don't delete properties from new_datapoint
            current_datapoint = new_datapoint;
        }
        datapoint_answer_selected = null; // Reset selected answer
    }

    async function handleNext(e: any) {
        // Get the next datapoint
        let result = await (await backend.xai(user_id).get_train_datapoint(datapoint_count)).json() as TDatapointResult;
        new_datapoint = result;
        //-----------------------------------------------------------------
        datapoint_answer_selected = null;
        setNewCurrentDatapoint();
    }

    function handleFeedbackButtonClick(event: any) {
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

    function transformDatapointForDisplay(datapoint: TDatapoint): { [key: string]: string } {
        const transformed: { [key: string]: string } = {};
        for (const [key, value] of Object.entries(datapoint)) {
            if (typeof value === 'string') {
                transformed[key] = value;
            } else if (value && typeof value === 'object' && 'current' in value) {
                transformed[key] = value.current;
            }
        }
        return transformed;
    }
</script>


<div class={"col-start-1 col-end-2"}>
    <TTMDatapoint
            data={transformDatapointForDisplay(current_datapoint)}
            feature_names={feature_names}
            feature_units={feature_units}
            feature_tooltips={feature_tooltips}
            prediction_probability={prediction_probability}
    />
</div>
<div class="col-start-2 col-end-3 overflow-y-scroll">

    <TTMChat {messages} user_input={true} {user_id}
             on:feedbackButtonClick={handleFeedbackButtonClick}
             on:streamComplete={handleStreamComplete}
             on:next={handleNext}
             on:questionClick={submitQuestion}
    />

</div>
<div class="col-start-3 col-end-4">
    <TTMQuestions
            {feature_questions}
            {general_questions}
            {current_prediction}
            feature_questions_dropdown={feature_names}
            on:submit={submitQuestion}
            on:next={handleNext}
    />
</div>

<style>
/* Add any styles if needed */
</style>



