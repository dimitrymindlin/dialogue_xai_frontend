import { env } from '$env/dynamic/public';

const PUBLIC_BACKEND_URL = env.PUBLIC_BACKEND_URL;

export default {
    xai: (user_id: string, study_group = 'A', user_ml_knowledge = "low") => ({
        init: () => fetch(`${PUBLIC_BACKEND_URL}init?user_id=${user_id}&study_group=${study_group}&ml_knowledge=${user_ml_knowledge}`),
        get_user_correctness: () => fetch(`${PUBLIC_BACKEND_URL}get_user_correctness?user_id=${user_id}`),
        get_proceeding_okay: () => fetch(`${PUBLIC_BACKEND_URL}get_proceeding_okay?user_id=${user_id}`),
        finish: () => fetch(PUBLIC_BACKEND_URL + "finish" + "?user_id=" + user_id, {method: 'DELETE',}),
        get_train_datapoint: (datapoint_count: number) =>
            fetch(PUBLIC_BACKEND_URL + "get_train_datapoint" +
                "?user_id=" + user_id +
                "&datapoint_count=" + datapoint_count),
        get_test_datapoint: (datapoint_count: number) =>
            fetch(PUBLIC_BACKEND_URL + "get_test_datapoint" +
                "?user_id=" + user_id +
                "&datapoint_count=" + datapoint_count),
        get_final_test_datapoint: (datapoint_count: number) =>
            fetch(PUBLIC_BACKEND_URL + "get_final_test_datapoint" +
                "?user_id=" + user_id +
                "&datapoint_count=" + datapoint_count),
        get_intro_test_datapoint: (datapoint_count: number) =>
            fetch(PUBLIC_BACKEND_URL + "get_intro_test_datapoint" +
                "?user_id=" + user_id +
                "&datapoint_count=" + datapoint_count),
        get_testing_questions: () => fetch(PUBLIC_BACKEND_URL + "get_testing_questions" + "?user_id=" + user_id),
        get_question_selection_response: (question: string, feature: string) => fetch(PUBLIC_BACKEND_URL + "get_response_clicked" + "?user_id=" + user_id, {
            method: "POST",
            body: JSON.stringify({question, feature})
        }),
        get_user_message_response: (message: string) => fetch(PUBLIC_BACKEND_URL + "get_response_nl" + "?user_id=" + user_id, {
            method: "POST",
            body: JSON.stringify({message})
        }),
        get_user_message_response_stream: (message: string, onChunk: (chunk: any) => void) => {
            return fetch(PUBLIC_BACKEND_URL + "get_response_nl" + "?user_id=" + user_id, {
                method: "POST",
                body: JSON.stringify({message, streaming: true})
            }).then(async response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                
                if (!reader) {
                    throw new Error('No reader available');
                }
                
                let buffer = '';
                
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }
                    
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data.trim()) {
                                try {
                                    const parsed = JSON.parse(data);
                                    console.log('Stream chunk received:', parsed);
                                    onChunk(parsed);
                                } catch (e) {
                                    console.error('Error parsing SSE data:', e, data);
                                }
                            }
                        }
                    }
                }
                
                // Process any remaining data in buffer
                if (buffer.trim() && buffer.startsWith('data: ')) {
                    const data = buffer.slice(6);
                    if (data.trim()) {
                        try {
                            const parsed = JSON.parse(data);
                            console.log('Final stream chunk:', parsed);
                            onChunk(parsed);
                        } catch (e) {
                            console.error('Error parsing final SSE data:', e, data);
                        }
                    }
                }
            });
        },
        set_user_prediction: (experiment_phase: string, datapoint_count: number, user_prediction: string) => fetch(PUBLIC_BACKEND_URL + 'set_user_prediction', {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                user_id,
                experiment_phase,
                datapoint_count,
                user_prediction
            })
        }),
    }),
}
