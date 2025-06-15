import {goto} from '$app/navigation';
import {base} from '$app/paths';
import {browser} from '$app/environment';

export const userId = {
    get: getUserIdOnPage,
    set: setUserIdOnPage
};

export const studyGroup = {
    get: getStudyGroupFromUrl,
    set: setStudyGroupInUrl
};

export const userMLKnowledge = {
    get: getUserMLKnowledgeFromUrl,
    set: setUserMLKnowledgeInUrl
};

function getUserIdOnPage(): string | null {
    if (!browser) return null;
    const user_id = window.localStorage.getItem('user_id');
    if (user_id == null) {
        goto(base + '/');
    }
    return user_id
}

function setUserIdOnPage(id: string): void {
    if (!browser) return;
    window.localStorage.setItem('user_id', id);
}

function getStudyGroupFromUrl(): string | null {
    if (!browser) return null;
    const urlParams = new URLSearchParams(window.location.search);
    const sg = urlParams.get('sg');
    if (sg == null) {
        // Optionally redirect if sg is not present; adjust as needed
        goto(base + '/');
    }
    return sg;
}

function setStudyGroupInUrl(sg: string): void {
    if (!browser) return;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('sg', sg);
    // Update the URL without reloading the page
    window.history.pushState({}, '', `${window.location.pathname}?${urlParams}`);
}

function getUserMLKnowledgeFromUrl(): string | null {
    if (!browser) return null;
    const urlParams = new URLSearchParams(window.location.search);
    const knowledge = urlParams.get('ml_knowledge');
    if (knowledge == null) {
        // Optionally redirect if ml_knowledge is not present; adjust as needed
        goto(base + '/');
    }
    return knowledge;
}

function setUserMLKnowledgeInUrl(knowledge: string): void {
    if (!browser) return;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('ml_knowledge', knowledge);
    // Update the URL without reloading the page
    window.history.pushState({}, '', `${window.location.pathname}?${urlParams}`);
}


