export interface QuestionnaireConfig {
    questions: string[];
    attentionCheck?: {
        questionIndex: number;
        correctAnswer: string;
        checkId: string;
    };
    title: string;
    subtitle: string;
}

export const chatQuestionnaireConfig: QuestionnaireConfig = {
    questions: [
        'The chatbot is cooperative.', // AL4
        'I like the chatbot.', // AL2
        "While explaining, the chatbot met me halfway.", // coco3
        'The chatbot has no clue of what it is doing.', // AI3
        "The chatbot intended to provide me with the opportunity to build an understanding of the topic by asking questions.", // scaf1
        "The chatbot encouraged me to continuously think about further details of the topic.", // scaf2
        'The chatbot always gives good advice.', // UT1
        'The chatbot can collaborate in a productive way.', // UAL4
        "The chatbot considered my understanding.", // coco2
        'The chatbot acts truthfully.', // UT2
        'The chatbots appears confused.', // AC4
        "While explaining, it was important for the chatbot to monitor whether I understood everything.", // moni2
        "The chatbot responded when I signaled non-understanding.", // moni3
        "The chatbot took my statements into account.", // coco4
        'The chatbot acts intentionally', // AI1
        'I can see myself using the chatbot in the future.', // UAA2
        'When finishing to read this sentence, select Strongly Disagree to prove that you pay attention.',
        "While explaining, it was important for the chatbot to continuously consider whether I understood the explanation.", // moni1
        "The chatbot encouraged me to visualize the different processes of the topic.", // scaf4
        'I can rely on the chatbot.', // UT3
        'The chatbot is easy to use.', // AU1
        "The explanation was meant to encourage me to question my understanding.", // coco5
        "The chatbot carefully adapted its utterances to my responses." // coco1
    ],
    attentionCheck: {
        questionIndex: 16, // Position of attention check question
        correctAnswer: "-2",
        checkId: "4"
    },
    title: "You are done <b>with the tasks</b>. <b>Thank you!</b>",
    subtitle: "Lastly, we are interested in <b>how you liked to work with the Chatbot</b> to understand the models decisions."
};

export const staticQuestionnaireConfig: QuestionnaireConfig = {
    questions: [
        "The explanation report is coherent.",
        "I find the explanation report useful.",
        "The explanation report is clear and understandable.",
        "The explanation report provides insightful information.",
        "The explanation report supports productive insights.",
        "The information in the report is presented accurately.",
        "The explanation report seems confusing.",
        "The explanation report is engaging.",
        'I pay attention. Select -1 to prove it.',
        "The explanation report presents information purposefully.",
        "I can see myself referring to this type of explanation report in the future.",
        "I can rely on the information provided in the explanation report.",
        "The explanation report is easy to navigate and understand."
    ],
    attentionCheck: {
        questionIndex: 8, // Position of attention check question
        correctAnswer: "-1",
        checkId: "4"
    },
    title: "You are done <b>with the tasks</b>. <b>Thank you!</b>",
    subtitle: "Lastly, we are interested in <b>how you liked to work with the explanation report</b> to understand the models decisions."
};

export function getQuestionnaireConfig(dataset: string, studyGroup?: string): QuestionnaireConfig {
    if (studyGroup === 'static') {
        return staticQuestionnaireConfig;
    } else {
        return chatQuestionnaireConfig;
    }
}