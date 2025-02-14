<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper} from '@skeletonlabs/skeleton';
    import {onMount} from 'svelte';
    import {PUBLIC_TEACH_TEST_CYCLES} from "$env/static/public";
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
    let prolific_id = "";
    let consent_given: boolean = false;
    let pdfPath = `${base}/Adult-Consent.pdf`;
    let step1_gif_path = `${base}/intro-test.gif`;
    let step2_gif_path_static = `${base}/learning-teaching-static.gif`;
    let step2_gif_path_interactive = `${base}/learning-teaching-interactive.gif`;
    let step2_gif_path_chat = `${base}/learning-teaching-chat.gif`;
    let step3_gif_path = `${base}/learning-testing.gif`;
    let step4_gif_path = `${base}/final-test.gif`;
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
            study_group.set('chat');
        });

        user_id = await userId.get();
    });

    async function onComplete() {
        // First check if all the fields are filled out
        const checks = [
            {condition: prolific_id === '', message: 'Please insert your prolific id before proceeding.'},
            {condition: fam_ml_val === -1, message: 'Please rate your familiarity with AI.'},
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
        goto(`${base}/attentioncheck/adult?user_id=${user_id}&sg=${study_group}&ml_knowledge=${fam_ml_val}`);
        //goto(`${base}/experiment?user_id=${user_id}&sg=${study_group}`);
    }

    let study_group_interactive_text =
        'in an <b>interactive chatbot</b>.';

    let study_group_chat_text =
        'in a <b>chatbot</b>.';

    let study_group_static_text =
        'in an <b>explanation report</b>.';
</script>

<div class="col-start-2 col-end-2 space-y-4 p-2 sm:p-2 md:space-y-6">
    <h1 class="text text-4xl">Welcome!</h1>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper buttonCompleteLabel="Start Experiment" on:complete={onComplete}>
        <Step>
            <p>
                This is a study on <b>understanding the decision process of Artificial Intelligence (AI) models</b>
                which takes about 30 minutes. <br> It is designed as part of a large research project
                that seeks to improve understanding between AI Systems (i.e. Machine Learning models) and humans.<br/>
            </p>

            <p class="m my-12">
                Thank you for your participation! <br/><br/>

                Sincerely, <br/><br/>

                <b>Dimitry Mindlin</b>, Bielefeld University
            </p>
        </Step>
        <Step locked={!consent_given}>
            <p>
                Please read the consent form and agree to participate in the study.
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
                Please <b>keep your experiment ID</b> for future reference. <br>
                You will need it to request deletion of your data from the study if you wish.
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
                Experiment topic: Understanding AI predictions about individual's income
            </h2>
            <p>
                Have you ever considered the impact of AI and Machine Learning in the financial sector,
                particularly in <b>predicting the income of individuals</b>? This is where the world of
                Machine Learning can be used to recognize patterns from past years of census data.<br/><br/>

                In this experiment, you will <b>discover why Machine Learning model's predict a specific outcome</b>.
                The model was trained <b>on data before the 20th century</b>, so the situation differs from today's reality.
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">
                Concrete Example
            </h2>
            <p>For example, look at the individual with the following information (attributes and their values):</p>
            <img src="{base}/adult_datapoint.png" alt="Adult Datapoint img" style="width: 25vw;">
            <p>
                The trained Machine Learning can accurately <b>predict</b> whether this individual has an income
                of <b>more than 50k</b> a year or less, based on what it learned from the data.
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <div>
                    <h3><b style="color: dodgerblue;">Introduction Phase:</b> Looking at the attributes of the person, <b>try
                        to guess whether the individual earns more or lass than 50k a year by your intuition</b>.</h3>
                    <img alt="Step1 gif" src={step1_gif_path} style="height: 50vh;"/>
                </div>
            </div>
        </Step>
        <Step>
            <!-- Learning Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: green;">Learning Phase:</b> Look at the attributes of the person and give a guess, whether this person earns more or less than 50k a year.</h3>
                <p>Afterward, you can see the Machine Learning model's prediction and request explanations for the prediction.</p>
                {#if study_group === 'interactive'}
                    {@html study_group_interactive_text}
                    <img alt="Step2 gif" src={step2_gif_path_interactive} style="height: 50vh;"/>
                {:else if study_group === 'chat'}
                    {@html study_group_chat_text}
                    <img alt="Step2 gif" src={step2_gif_path_chat} style="height: 50vh;"/>
                {:else}
                    {@html study_group_static_text}
                    <img alt="Step2 gif" src={step2_gif_path_static} style="height: 50vh;"/>
                {/if}
                <p>When you feel that you understand the reason for the model's decision, continue by clicking <b>Proceed</b>.
                </p>
            </div>
        </Step>
        <Step>
            <!-- Testing Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: purple;">Testing Phase:</b> Guess the model prediction for a <b>similar
                    individual</b> as seen before.</h3>
                <p>For this <b>new individual, you will not receive the model's prediction or explanations</b>.</p>
                <img alt="Step3 gif" src={step3_gif_path} style="height: 50vh;"/>
                <p>You will repeat the "learning - testing" cycle for a total of <b>{PUBLIC_TEACH_TEST_CYCLES}</b>
                    times.</p>
            </div>
        </Step>
        <Step>
            <!-- Final Testing Phase -->
            <h2 class="text-2xl">Experiment Structure</h2>
            <div class="container">
                <h3><b style="color: dodgerblue;">Final Testing Phase</b>: As in the earlier testing component of the
                    learning-testing cycle,</h3>
                <p><b>Predict the model's output for a new individual</b> without access to the model's prediction or
                    explanations.</p>
                <img alt="Step4 gif" src={step4_gif_path} style="height: 50vh;"/>
                <p>In this phase, correct answers give points and participants in the <b>top 10% qualify for a
                    bonus payment</b>.</p>
            </div>
        </Step>

        <Step>
            <h2 class="text-2xl">General Information</h2>
            <p>
                <b>Attention:</b> Do not use the <b>browser's back button</b> during the experiment. This will cause the
                <b>experiment to
                    restart</b>.
                <br>
                <br>
            </p>
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
                    <span>Rate your level of familiarity with artificial intelligence (AI):</span>
                    <select bind:value={fam_ml_val} class="select py-1">
                        <option value="" selected>- Select -</option>
                        <option value="0">Very low: I have little to no understanding of AI.</option>
                        <option value="1">Low: I have basic knowledge but limited understanding of AI concepts.
                        </option>
                        <option value="2">Moderate: I have a fair understanding of AI concepts and its applications.
                        </option>
                        <option value="3">High: I am knowledgeable about AI and how it is developed.</option>
                        <option value="4">Very high: I am highly knowledgeable in AI and can train algorithms.</option>
                        <option value="anonymous">Prefer not to say</option>
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