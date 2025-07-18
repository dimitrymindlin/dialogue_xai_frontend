<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper} from '@skeletonlabs/skeleton';
    import {onMount} from 'svelte';
    import { env } from '$env/dynamic/public';
    import ToggleableGif from '$lib/components/ToggleableGif.svelte';

    const PUBLIC_TEACH_TEST_CYCLES = env.PUBLIC_TEACH_TEST_CYCLES;
    import {userId} from "$lib/shared";

    let gender: string;
    let gender_self_identify: string;
    let age: string;
    let degree: string;
    let education_field: string;
    let education_field_other: string;
    let english_speaking_level: string;
    let fam_ml_val = -1;
    let fam_domain_val: number;
    let ml_studies_participation = "";
    let xai_studies_participation = "";
    let prolific_id = "";
    let consent_given: boolean = false;
    let pdfPath = `${base}/Consent.pdf`;
    let diabetes_datapoint_path = `${base}/diabetes_intro/diabetes_datapoint.png`;
    let step1_gif_path = `${base}/diabetes_intro/intro_test.gif`;
    let step2_gif_path_static = `${base}/diabetes_intro/learning-teaching-static.gif`;
    let step2_gif_path_interactive = `${base}/diabetes_intro/learning-teaching-interactive.gif`;
    let step2_gif_path_chat = `${base}/diabetes_intro/learning-teaching-chat.gif`;
    let step3_gif_path = `${base}/diabetes_intro/learning-testing.gif`;
    let step4_gif_path = `${base}/diabetes_intro/final_test.gif`;
    const experiment_start = new Date().toISOString();

    let user_id;
    let study_group;

    onMount(async () => {
        fetch(`${base}/api/get_study_group`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((response) => {
            if (response.ok) {
                response.text().then((text) => {
                    study_group = text;
                });
            } else {
                console.error('Server responded with non-OK status');
                study_group = 'chat';
            }
        }).catch((error) => {
            console.error('Error:', error);
            study_group = 'chat';
        });

        user_id = await userId.get();
    });

    async function onComplete() {
        // First check if all the fields are filled out
        const checks = [
            {condition: prolific_id === '', message: 'Please insert your prolific id before proceeding.'},
            {condition: fam_ml_val === -1, message: 'Please rate your familiarity with AI.'},
            {condition: ml_studies_participation === '', message: 'Please indicate your participation in machine learning studies.'},
            {condition: xai_studies_participation === '', message: 'Please indicate your participation in explainable AI studies.'},
        ];

        for (let check of checks) {
            if (check.condition) {
                alert(check.message);
                return;
            }
        }

        let profile_data = {
            gender: gender,
            gender_self_identify: gender_self_identify,
            age: age,
            degree: degree,
            education_field: education_field,
            education_field_other: education_field_other,
            fam_ml_val: fam_ml_val,
            fam_domain_val: fam_domain_val,
            ml_studies_participation: ml_studies_participation,
            xai_studies_participation: xai_studies_participation,
            english_speaking_level: english_speaking_level,
            experiment_start: experiment_start
        };

        fetch(`${base}/api/setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: user_id,
                profile_data: profile_data,
                study_group: study_group,
                prolific_id: prolific_id
            })
        });
        goto(`${base}/attentioncheck/diabetes?user_id=${user_id}&sg=${study_group}&ml_knowledge=${fam_ml_val}`);
        //goto(`${base}/experiment?user_id=${user_id}&sg=${study_group}`);
    }

    let study_group_interactive_text =
        'in an <b>interactive chatbot</b>.';

    let study_group_chat_text =
        'in a <b>chatbot</b>.';

    let study_group_static_text =
        'in an <b>explanation report</b>';
</script>

<div class="col-start-2 col-end-2 space-y-4 p-2 sm:p-2 md:space-y-6">
    <h1 class="text text-4xl">Welcome!</h1>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper buttonCompleteLabel="Start Experiment" on:complete={onComplete}>
        <Step>
            <p>
                Welcome! This study takes about 35 minutes and helps us learn how people understand AI decisions.
                You'll explore how AI makes predictions about diabetes and uncover its reasoning. No prior knowledge is needed—just curiosity!
            </p>

            <p class="m my-12">
                Thank you for your participation! <br/><br/>

                Sincerely, <br/><br/>

                <b>Dimitry Mindlin</b>, Bielefeld University
            </p>
        </Step>
        <Step locked={!consent_given}>
            <p>
                Before we begin, please review the consent form and confirm that you'd like to participate.
            </p>
            <iframe title="Consent Form" src={pdfPath} width="100%" height="500vh">
                This browser does not support PDFs. Please download the PDF to view it.
            </iframe>
            <div style="display: flex; flex-direction: row; align-items: flex-start;">
                <input type="checkbox" id="consent" bind:checked={consent_given}
                       style="margin-right: 10px; transform: scale(1.5);"/>
                <div>
                    <label for="consent">
                        I hereby agree that I
                    </label>
                    <ul style="list-style-type: disc;">
                        <li>have read the participant information and that I understand it</li>
                        <li>agree to participate voluntarily in the study under the conditions described in the
                            participant information
                        </li>
                        <li>am at least 18 years of age</li>
                    </ul>
                </div>
            </div>
        </Step>
        <Step>
            <h2 class="text-2xl">Your Experiment ID</h2>
            <p>
                Your <b>Experiment ID is important</b>! Save it in case you ever want to remove your data from the study.
                <br><br>
                {user_id}
                <br><br>
                Your privacy is paramount to us. Therefore, your <b>prolific ID will not be stored</b> alongside your
                experiment data. It will solely be used for the issuance of bonus payments, should you qualify, and
                deleted afterward.
                Should you desire to delete your experiment data, kindly reach out to us, providing your experiment ID.
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">
                Experiment topic: Understanding AI predictions about diabetes risk
            </h2>
            <p>

                Did you know that <b>AI is used to predict people's diabetes risk</b>? Doctors, researchers, and healthcare systems use AI to
                find patterns in medical data. In this experiment, you'll explore how AI makes these predictions and
                uncover the reasons behind its decisions.

                The AI model you'll interact with was trained on <b>real medical data</b> to learn patterns that might indicate diabetes risk. Your task is to figure out how and why the AI makes
                its choices. Ready to dive in?
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">
                Concrete Example
            </h2>
            <p>For example, look at the individual with the following medical information (attributes and their values).
                The AI model looks at a person's health data and <b>predicts</b> whether they have <b>diabetes</b> or not. Let's explore how it does that!
            </p>
            <img src={diabetes_datapoint_path} alt="Diabetes Datapoint img" style="width: 20vw;">
        </Step>
        <Step>
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <div>
                    <h3><b style="color: dodgerblue;">Introduction Phase:</b></h3>
                    <ol>
                        <li>1. <b>Observe:</b> Look at the person's medical information.</li>
                        <li>2. <b>Make a Guess:</b> Use your intuition to decide whether the individual <b>has diabetes</b> or not.</li>
                    </ol>
                    <ToggleableGif alt="Step1 gif" src={step1_gif_path} smallSize="35vw" largeSize="100vw" />
                </div>
            </div>
        </Step>
        <Step>
            <!-- Learning Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: green;">Learning Phase:</b></h3>
                <ol>
                    <li>1. <b>Make a Guess:</b> Look at another person's medical information and make a prediction.
                    </li>
                    <li>2. <b>See what the AI thinks:</b> Check the AI's prediction.</li>
                    <li>3. <b>Ask Why:</b> You can explore why the AI made that decision by asking questions.
                    </li>
                    <li>4. <b>Proceed:</b> Once you're ready, move on by clicking <b>Proceed</b>.
                    </li>
                </ol>
                {#if study_group === 'interactive'}
                    <ToggleableGif alt="Step2 gif" src={step2_gif_path_interactive} smallSize="35vw" largeSize="100vw" />
                {:else if study_group === 'chat'}
                    <ToggleableGif alt="Step2 gif" src={step2_gif_path_chat} smallSize="35vw" largeSize="100vw" />
                {:else}
                    <ToggleableGif alt="Step2 gif" src={step2_gif_path_static} smallSize="35vw" largeSize="100vw" />
                {/if}
            </div>
        </Step>
        <Step>
            <!-- Testing Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: purple;">Testing Phase:</b></h3>
                <ol>
                    <li>1. <b>Predict:</b> Can you guess what the AI would say for a <b>similar person</b>?
                    </li>
                    <li>2. <b>This time, no help:</b> You won't see the AI's answer—just your own judgment!
                    </li>
                    <li>3. <b>Do this a few times:</b> to see if you're getting better at it. (<b>{PUBLIC_TEACH_TEST_CYCLES}</b> times)
                    </li>
                </ol>
                <ToggleableGif alt="Step3 gif" src={step3_gif_path} smallSize="35vw" largeSize="100vw" />
            </div>
        </Step>
        <Step>
            <!-- Final Testing Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: dodgerblue;">Final Testing Phase</b></h3>
                <ol>
                    <li>1. <b>Final Round of Guessing:</b> Can you predict the AI's decision for a completely new person?
                    </li>
                    <li>2. <b>Explain your choice:</b> Why do you think your guess is right?</li>
                    <li>3. <b>Earn Points:</b> Correct predictions get you closer to a reward.</li>
                    <li>4. <b>Top performers win a bonus!:</b> If you're in the top <b>10%</b>, you'll get extra payment.
                    </li>
                </ol>
                <ToggleableGif alt="Step4 gif" src={step4_gif_path} smallSize="35vw" largeSize="100vw" />
            </div>
        </Step>

        <Step>
            <h1 class="text-2xl">
                ⚠️ <b>Browser Back Button</b>: Avoid using the back button—it will restart the experiment! <br>
                ⚠️ <b>No Personal Information in Chat</b>: When using the chatbot, your messages will be sent to OpenAI and your
                personal information is not required and should not be sent. <br>
                <br>
                <br>
            </h1>
        </Step>
        <Step>
            <h2 class="text-2xl">Your Information</h2>
            <p>
                We would like to know your prolific_id to pay the bonus payment and
                to assess your knowledge of Machine Learning.
            </p>
            <hr/>
            <div class="grid grid-cols-2 gap-8">
                <label for="prolific_id" class="label text-center">
                    <span>Prolific id</span><br/>
                    <input id="prolific_id" class="input w-32 py-1" bind:value={prolific_id}/>
                </label>
                <label for="familiarityML" class="label text-center">
                    <span>How much do you know about AI? Choose the option that best describes you:</span>
                    <select bind:value={fam_ml_val} class="select py-1">
                        <option value="" selected>- Select -</option>
                        <option value="very low">Very low: I have little to no understanding of AI.</option>
                        <option value="low">Low: I have basic knowledge but limited understanding of AI concepts.
                        </option>
                        <option value="moderate">Moderate: I have a fair understanding of AI concepts and its applications.
                        </option>
                        <option value="high">High: I am knowledgeable about AI and how it is developed.</option>
                        <option value="very high">Very high: I am highly knowledgeable in AI and can train algorithms.</option>
                        <option value="anonymous">Prefer not to say</option>
                    </select>
                </label>
                <label for="ml_studies" class="label text-center">
                    <span>Have you participated in machine learning studies before?</span>
                    <select bind:value={ml_studies_participation} class="select py-1">
                        <option value="" selected>- Select -</option>
                        <option value="never">Never</option>
                        <option value="a few times">A few times</option>
                        <option value="regularly">Regularly</option>
                    </select>
                </label>
                <label for="xai_studies" class="label text-center">
                    <span>Have you participated in explainable AI studies before?</span>
                    <select bind:value={xai_studies_participation} class="select py-1">
                        <option value="" selected>- Select -</option>
                        <option value="never">Never</option>
                        <option value="a few times">A few times</option>
                        <option value="regularly">Regularly</option>
                    </select>
                </label>
            </div>
        </Step>
    </Stepper>
</div>


<style>

    li {
        margin: 10px 0;
    }
</style>