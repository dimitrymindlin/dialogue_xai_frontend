import backend from '$lib/backend';
import {error} from '@sveltejs/kit';
import type {PageLoad} from './$types';
import type {TDatapointResult} from '$lib/types';

/**
 * experiment start: creates the experiment with the user_id
 * in the backend and gets questions, feature_tooltips and feature_units,
 * afterwards it loads the first datapoint and the initial prompt and
 * returns all information to the frontend.
 *
 * waterfall model, nothing runs in parallel
 * init -> get_train_datapoint -> return data to frontend
 */
export const load = (async ({url}) => {
    // backend returns data that is either questions or report (A/B study design)
    const user_id = url.searchParams.get('user_id') || 'default_user';
    const study_group = "interactive";
    
    console.log('Page load - user_id from URL:', user_id);

    try {
        // Init
        const {
            questions,
            feature_tooltips,
            feature_units,
            prediction_choices,
            feature_names,
            user_study_task_description
        } = await (await backend.xai(user_id, study_group, "low").init()).json();

        // Get Initial Train Datapoint
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            id,
            prediction_probability,
            ...datapoint
        } = await (await backend.xai(user_id).get_train_datapoint(1)).json() as TDatapointResult;

        return {
            user_id,
            study_group: study_group,
            questions,
            feature_names,
            feature_tooltips,
            feature_units,
            prediction_probability,
            datapoint,
        }
    } catch (e) {
        console.error('Backend connection failed:', e);
        
        return {
            user_id,
            study_group: "interactive",
            questions: [],
            feature_names: [],
            feature_tooltips: {},
            feature_units: {},
            prediction_probability: [],
            datapoint: {},
        }
    }
}) satisfies PageLoad;