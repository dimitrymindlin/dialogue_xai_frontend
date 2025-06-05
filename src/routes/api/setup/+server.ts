import type {RequestHandler} from './$types';
import {
    createProlificParticipant,
    createUniParticipant,
    set_study_group,
    get_study_group_name,
    setMatrikNum,
    setProlificId,
    setupUserProfile
} from '$lib/pg'

export const POST: RequestHandler = async ({request}) => {
    const body = await request.json();
    
    // Add the meaningful study group name to the profile data
    const studyGroupName = await get_study_group_name();
    const profileDataWithStudyGroupName = {
        ...body.profile_data,
        study_group_name: studyGroupName
    };
    
    await setupUserProfile(body.user_id, profileDataWithStudyGroupName);
    await set_study_group(body.user_id, body.study_group);
    
    if (body.matrikelnummer !== undefined) {
        await createUniParticipant(body.matrikelnummer);
        await setMatrikNum(body.user_id, body.matrikelnummer);
    }
    if (body.prolific_id !== undefined) {
        await createProlificParticipant(body.user_id, body.prolific_id);
        await setProlificId(body.user_id, body.prolific_id);
    }
    return new Response('ok');
};