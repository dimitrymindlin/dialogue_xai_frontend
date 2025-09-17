export interface DatasetConfig {
    // For TTM-Experiment-Datapoint
    introTestDescription: string;
    introTestDescriptionBaseline: string;
    predictionQuestion: string;
    
    // For TTM-Chat
    chatSuggestions: string[];
    
    // For Intro-Done-Popup
    understandingQuestion: string;
    understandingQuestionBaseline: string;
}

export const adultDatasetConfig: DatasetConfig = {
    introTestDescription: "The table shows a <b>description of a person</b>. <br> " +
        "<b>Task</b>: Guess if the current person is earning <b>more or less than 50k$</b> a year.<br>" +
        "<b>Note</b>: You will not see the model prediction and explanations in the Introduction Phase.",
    introTestDescriptionBaseline: "The table shows a <b>description of a person</b>. <br> " +
        "<b>Task</b>: Guess if the current person is earning <b>more or less than 50k$</b> a year.<br>" +
        "<b>Note</b>: You will see the model prediction after making your guess in the Introduction Phase.",
    predictionQuestion: "What will the model predict for the current case?",
    chatSuggestions: [
        "Explain this prediction to me",
        "Why under 50k?",
        "Why over 50k?",
        "Why do you think so?",
        "What factors matter the most in how the model makes its decision?",
        "Which features play the strongest role in influencing the model's prediction?",
        "What factors have very little effect on the model's decision?",
        "Which features contribute the least to the model's prediction?",
        "How much does each feature influence the prediction for this person?",
        "How strong is the effect of each factor on this person's outcome?",
        "What features would have to change to get a different prediction?",
        "What would need to be different for this person to get the opposite prediction?",
        "How confident is the model in this prediction?",
        "How certain is the model about this person's outcome?"
    ],
    understandingQuestion: "I have a good understanding of which factors most influence the income of an individual.",
    understandingQuestionBaseline: "I am confident in predicting what the model will decide about an individual's income."
};

export const diabetesDatasetConfig: DatasetConfig = {
    introTestDescription: "The table shows a <b>person's medical information</b>. <br> " +
        "<b>Task</b>: Guess if the current person <b>has diabetes</b> or not.<br>" +
        "<b>Note</b>: You will not see the model prediction and explanations in the Introduction Phase.",
    introTestDescriptionBaseline: "The table shows a <b>person's medical information</b>. <br> " +
        "<b>Task</b>: Guess if the current person <b>has diabetes</b> or not.<br>" +
        "<b>Note</b>: You will see the model prediction after making your guess in the Introduction Phase.",
    predictionQuestion: "What will the model predict for the current case?",
    chatSuggestions: [
        "Explain this prediction to me",
        "Why diabetes?",
        "Why no diabetes?",
        "Why do you think so?",
        "What factors matter the most in how the model makes its decision?",
        "Which medical factors play the strongest role in influencing the model's prediction?",
        "What factors have very little effect on the model's decision?",
        "Which medical indicators contribute the least to the model's prediction?",
        "How much does each medical factor influence the prediction for this person?",
        "How strong is the effect of each factor on this person's diabetes risk?",
        "What medical factors would have to change to get a different prediction?",
        "What would need to be different for this person to get the opposite prediction?",
        "How confident is the model in this prediction?",
        "How certain is the model about this person's diabetes risk?"
    ],
    understandingQuestion: "I have a good understanding of which factors most influence the diabetes risk of an individual.",
    understandingQuestionBaseline: "I am confident in predicting what the model will decide about an individual's diabetes risk."
};

export function getDatasetConfig(dataset: string): DatasetConfig {
    switch (dataset) {
        case 'diabetes':
            return diabetesDatasetConfig;
        case 'adult':
            return adultDatasetConfig;
        case 'german_credit':
        case 'sf_crime':
            // For now, default to adult config for unsupported datasets
            return adultDatasetConfig;
        default:
            return adultDatasetConfig;
    }
}