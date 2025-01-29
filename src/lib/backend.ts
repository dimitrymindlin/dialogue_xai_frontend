import { env } from '$env/dynamic/public';

const PUBLIC_BACKEND_URL = env.PUBLIC_BACKEND_URL;

export default {
    xai: (user_id: string, study_group = 'A', kgs_id = "test") => ({
        init: () => fetch(`${PUBLIC_BACKEND_URL}init?user_id=${user_id}&study_group=${study_group}`),
        get_user_correctness: () => fetch(`${PUBLIC_BACKEND_URL}get_user_correctness?user_id=${user_id}`),
        get_proceeding_okay: () => fetch(`${PUBLIC_BACKEND_URL}get_proceeding_okay?user_id=${user_id}`),
        finish: () => fetch(PUBLIC_BACKEND_URL + "finish" + "?user_id=" + user_id, {method: 'DELETE',}),
        get_train_datapoint: () => fetch(PUBLIC_BACKEND_URL + "get_train_datapoint" + "?user_id=" + user_id),
        get_test_datapoint: () => fetch(PUBLIC_BACKEND_URL + "get_test_datapoint" + "?user_id=" + user_id),
        get_production_datapoint: () => fetch(PUBLIC_BACKEND_URL + "get_production_datapoint" + "?user_id=" + user_id + "&kgs_id=" + kgs_id),
        get_final_test_datapoint: () => fetch(PUBLIC_BACKEND_URL + "get_final_test_datapoint" + "?user_id=" + user_id),
        get_intro_test_datapoint: () => fetch(PUBLIC_BACKEND_URL + "get_intro_test_datapoint" + "?user_id=" + user_id),
        get_testing_questions: () => fetch(PUBLIC_BACKEND_URL + "get_testing_questions" + "?user_id=" + user_id),
        get_question_selection_response: (question: string, feature: string) => fetch(PUBLIC_BACKEND_URL + "get_response_clicked" + "?user_id=" + user_id, {
            method: "POST",
            body: JSON.stringify({question, feature})
        }),
        get_user_message_response: (message: string) => fetch(PUBLIC_BACKEND_URL + "get_response_nl" + "?user_id=" + user_id, {
            method: "POST",
            body: JSON.stringify({message})
        }),
        set_user_prediction: (user_prediction: string) => fetch(PUBLIC_BACKEND_URL + 'set_user_prediction' + `?user_id=${user_id}`, {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({user_prediction})
        }),
    }),
}
