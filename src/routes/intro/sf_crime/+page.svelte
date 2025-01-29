<script lang="ts">
    import {goto} from '$app/navigation';
    import {base} from '$app/paths';
    import {Step, Stepper} from '@skeletonlabs/skeleton';
    import {onMount} from 'svelte';
    import {v4 as uuidv4} from 'uuid';

    import {env} from '$env/dynamic/public';

    const PUBLIC_TEACH_TEST_CYCLES = env.PUBLIC_TEACH_TEST_CYCLES;

    let gender: string;
    let gender_self_identify: string;
    let age: string;
    let degree: string;
    let education_field: string;
    let education_field_other: string;
    let english_speaking_level: string;
    let fam_ml_val: number;
    let fam_domain_val: number;
    let consent_given: boolean = false;
    let pdfPath = `${base}/Diabetes-Consent.pdf`;
    const user_id = uuidv4();
    const experiment_start = new Date().toISOString();

    let study_group: any;
    onMount(() => {
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
                study_group = 'static';
            }
        }).catch((error) => {
            console.error('Error:', error);
            study_group.set('static');
        });
    });

    async function onComplete() {
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
            })
        });
        goto(`${base}/experiment?user_id=${user_id}&sg=${study_group}`);
    }

    let study_group_interactive_text =
        'Get familiar with the model\'s prediction with an <b>interactive chatbot</b>.';

    let study_group_static_text =
        'Get familiar with the ML model\'s prediction in an <b>explanation report</b>.';
</script>

<div class="col-start-2 col-end-2 space-y-4 p-2 sm:p-2 md:space-y-6">
    <h1 class="text text-4xl">Welcome!</h1>
    <!-- https://www.skeleton.dev/components/steppers -->
    <Stepper buttonCompleteLabel="Start Experiment" on:complete={onComplete}>
        <Step>
            <p>
                This is an introductory activity on <b>understanding the decision process of Artificial Intelligence
                (AI) models</b>
                which takes about 15-20 minutes. It is designed to introduce you to the type of explanations that
                we work with and should prepare you for the in-person workshop.<br/>
            </p>

            <p class="m my-12">
                Thank you for your participation! <br/><br/>

                Sincerely, <br/><br/>

                <b>Dimitry Mindlin</b>, Bielefeld University
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">
                Topic: Understanding AI predictions in predictive policing
            </h2>
            <p>
                In this activity, you will <b>discover how machine learning models make decisions</b> when predicting
                the likelihood of different crime levels for <b>districts in San Francisco</b>.
                <br/>
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">
                Concrete Example
            </h2>
            <p>For example, given a district with the following information (called attributes):</p>
            <ul class="list">
                <li><span class="flex-auto">- Avg Temp: 22 °C</span></li>
                <li><span class="flex-auto">- Day Of Week: Monday</span></li>
                <li><span class="flex-auto">- Month: February</span></li>
                <li><span class="flex-auto">- Month Period: MiddleOfMonth</span></li>
                <li><span class="flex-auto">- NFl Game Day: True</span></li>
                <li><span class="flex-auto">- Pd District: PARK</span></li>
            </ul>
            <p>
                The model would give a <b>prediction</b> whether this district has a <b>low crime</b>, <b>medium
                crime</b> or <b>high crime</b> level and can help with predictive policing strategies.
            </p>
        </Step>
        <Step>
            <h2 class="text-2xl">Activity - How will the model predict the crime level of different districts?</h2>
            <div class="container">
                <h1>The activity is structured as follows:</h1>
                <ol>
                    <li><b style="color: green;">Learning Phase:</b> Given one district's information at a time,
                        <b>guess the Machine Learning model's decision</b>.
                    </li>
                    <li>
                        {#if study_group === 'interactive'}
                            {@html study_group_interactive_text}
                        {:else}
                            {@html study_group_static_text}
                        {/if}
                        When you feel that you understand the reason for the models decision, proceed by clicking <b>Proceed</b>.
                    </li>
                    <li><b style="color: purple;">Testing Phase:</b> Guess the model prediction for a new district based
                        on your
                        understanding. For this <b>new district, you will not
                            receive the model's prediction or explanations</b>, since it is a test of the explanation
                        helpfulness.
                    </li>
                    <li>Complete this process for a total of <b>{PUBLIC_TEACH_TEST_CYCLES}
                        learning-testing district pairs </b>.
                    </li>
                    <li>Answer a few <b>questions about your model understanding</b> at the end.</li>
                </ol>
            </div>
        </Step>
        <Step>
            <h2 class="text-2xl">General Information</h2>
            <p class="note">Attention: The goal isn't to be right about whether a district is high crime or not. It's
                all about estimating what the model would predict based on the explanations you see.</p>
            <br>
            <p>
                Please do not use the <b>browser's back button</b> during the experiment. This will cause the <b>whole
                experiment to
                restart</b>.
                <br>
                <br>
            </p>
        </Step>
    </Stepper>
</div>


<style>

    ol {
        margin: 20px 0;
        list-style-type: decimal;
    }

    li {
        margin: 10px 0;
    }

    .note {
        font-weight: bold;
    }

</style>