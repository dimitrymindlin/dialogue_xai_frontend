import postgres from 'postgres';
import type {JSONValue} from 'postgres';

import dotenv from 'dotenv';
dotenv.config();

const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
const POSTGRES_DB = process.env.POSTGRES_DB;
const POSTGRES_HOST = process.env.POSTGRES_HOST;
const PUBLIC_A_B_SELECTION = process.env.PUBLIC_A_B_SELECTION;

const sql = postgres({
    host: POSTGRES_HOST,
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB
})

export async function setupUserProfile(userId: string, profileData: object) {
    return await sql`
        INSERT INTO users (id, profile)
        VALUES (${userId}, ${JSON.stringify(profileData)})
    `
}

export async function get_study_group() {
    try {
        // Directly return based on PUBLIC_A_B_SELECTION if not 'alternate'
        if (PUBLIC_A_B_SELECTION !== 'alternate') {
            return PUBLIC_A_B_SELECTION;
        }  else if (PUBLIC_A_B_SELECTION === 'alternate') {
            // Proceed with original logic for 'alternate'

            // Execute SQL queries to count users in each study group
            const staticCountResult = await sql`SELECT COUNT(*) as count
                                                FROM users
                                                WHERE study_group = 'static' AND completed = true`;
            const interactiveCountResult = await sql`SELECT COUNT(*) as count
                                                     FROM users
                                                     WHERE study_group = 'interactive' AND completed = true`;
            // Extract counts from query results
            const staticCount = parseInt(staticCountResult[0].count, 10);
            const interactiveCount = parseInt(interactiveCountResult[0].count, 10);

            // Determine and return the less used study group
            return interactiveCount <= staticCount ? 'interactive' : 'static';
        } else {
            // Handle unexpected PUBLIC_A_B_SELECTION values
            throw new Error('Invalid PUBLIC_A_B_SELECTION value');
        }
    } catch (error) {
        console.error('Error in get_study_group:', error);
        throw error; // or handle error as needed
    }
}


export async function getTwoAttentionChecksFailed(userId: string): Promise<boolean> {
    const result = await sql`
        SELECT attention_checks
        FROM user_completed
        WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
        return false;
    }

    const attentionChecks = result[0].attention_checks;
    if (attentionChecks === null) {
        return false;
    }

    const checkIds = Object.keys(attentionChecks);

    // Counter for failed checks.
    let failedChecks = 0;

    for (let i = 0; i < checkIds.length; i++) {
        const check = attentionChecks[checkIds[i]];
        if (check.check_id === "1") { // Ignore comprehension check
            continue;
        }
        if (Array.isArray(check.correct)) {
            // If check.correct is an array, check if check.selected is in the array
            if (!check.correct.includes(check.selected)) {
                failedChecks++;
            }
        } else {
            // If check.correct is not an array, perform direct comparison
            if (check.correct !== check.selected) {
                failedChecks++;
            }
        }

        // If at least two checks have failed, return true.
        if (failedChecks >= 2) {
            return true;
        }
    }
    // If less than two checks have failed, return false.
    return false;
}

export async function getComprehensionCheckFailed(userId: string): Promise<boolean> {
    // Check if comprehension check was failed ( id = 1 )
    const result = await sql`
        SELECT attention_checks
        FROM user_completed
        WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
        return false;
    }


    const attentionChecks = result[0].attention_checks;

    if (attentionChecks === null) {
        return false;
    }

    const check = attentionChecks["1"]; // Comprehension check id is 1

    if (check && check.correct !== check.selected) {
        return true;
    }

    return false;
}

export async function set_study_group(userId: string, studyGroup: string) {
    return await sql`
        UPDATE users
        SET study_group = ${studyGroup}
        WHERE id = ${userId}
    `;
}

export async function logEvent(userId: string,
                               source: string,
                               action: string,
                               details: object) {
    return await sql`
        INSERT INTO events (user_id, source, action, details)
        VALUES (${userId}, ${source}, ${action}, ${JSON.stringify(details)})
    `
}

// ATTENTION!: THIS WILL OVERWRITE THE FIELD `final_questionnaire` IN users.questionnaires IF IT ALREADY EXISTS
// DETAILS: https://www.postgresql.org/docs/current/functions-json.html
export async function saveQuestionnaireAnswers(
    userId: string,
    questions: string[],
    answers: number[],
    questionnaire_name = "exit"
) {
    return await sql`
        UPDATE users
        SET questionnaires = questionnaires || ${JSON.stringify(
                {[questionnaire_name]: {questions: questions, answers: answers}}
        )}
        WHERE id = ${userId}
    `
}

export async function logFinalFeedback(userId: string, feedback: string) {
    const timestamp = new Date().toISOString();
    return await sql`
        UPDATE users
        SET feedback = feedback || ${JSON.stringify(
                {timestamp: timestamp, feedback: feedback}
        )}
        WHERE id = ${userId}
    `;
}

export async function logAttentionChecks(userId: string, checkId: string, attentionData: JSONValue) {
    return await sql`
        INSERT INTO user_completed (user_id, attention_checks)
        VALUES (${userId}, ${sql.json({[checkId]: attentionData})}) ON CONFLICT (user_id)
        DO
        UPDATE SET attention_checks = user_completed.attention_checks || ${sql.json({[checkId]: attentionData})}
        WHERE user_completed.user_id = ${userId}
    `;
}

export async function logCompleted(userId: string) {
    return await sql`
        UPDATE users
        SET completed = true
        WHERE id = ${userId}
    `;
}

export async function createUniParticipant(matrikulation_num: string) {
    return await sql`
        INSERT INTO user_completed (matrik_num)
        VALUES (${matrikulation_num})
    `;
}

export async function createProlificParticipant(user_id: string, prolific_id: string) {
    return await sql`
        INSERT INTO user_completed (user_id, prolific_id)
        VALUES (${user_id}, ${prolific_id})
    `;
}

export async function setMatrikNum(userId: string, matrikulation_num: string) {
    return await sql`
        UPDATE users
        SET matrik_num = ${matrikulation_num}
        WHERE id = ${userId}
    `;
}

export async function setProlificId(userId: string, prolific_id: string) {
    return await sql`
        UPDATE users
        SET prolific_id = ${prolific_id}
        WHERE id = ${userId}
    `;
}

export async function getMatrikNum(userId: string) {
    const result = await sql`
        SELECT matrik_num
        FROM users
        WHERE id = ${userId}
    `;
    return result[0].matrik_num;
}

export async function deleteMatrikNum(userId: string) {
    return await sql`
        UPDATE users
        SET matrik_num = NULL
        WHERE id = ${userId}
    `;
}

export async function assignFinishedUniParticipant(matrikulation_num: string) {
    return await sql`
        UPDATE user_completed
        SET completed = true
        WHERE matrik_num = ${matrikulation_num}
    `;
}

export async function assignFinishedProlificParticipant(user_id: string) {
    return await sql`
        UPDATE user_completed
        SET completed = true
        WHERE user_id = ${user_id}
    `;
}