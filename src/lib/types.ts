type TGeneralQuestion = {
    question_id: string;
    question: string;
};

type TFeatureQuestion = {
    question_id: string;
    question: string;
    feature_id: number;
}

type TFeatureName = {
    feature_id: string;
    feature_name: string;
};

type TChatMessage = {
    id: string | number;
    text: string;
    isUser: boolean;
    feedback: boolean;
    question_id?: string;
    feature_id?: number;
    followup?: (TGeneralQuestion | TFeatureQuestion)[];
    reasoning?: string;
    isStreaming?: boolean;
    audio?: any;
    audio_error?: string;
};

type TDatapointValueWithHistory = {
    current: string;
    old: string;
};

type TDatapoint = {
    [key: string]: string | TDatapointValueWithHistory;
};

type StaticReport = {
    model_prediction: string;
    instance_type: string;
    feature_importance: Record<string, number>;
    opposite_class: string;
    counterfactuals: string;
    anchors: string;
};

type PredictionProbability = {
    label: string;
    probability: string;
};

type TDatapointResult = TDatapoint & {
    current_prediction: string;
    static_report: StaticReport;
    true_label: string;
    prediction_probability: PredictionProbability[];
};

type TInitResult = {
    questions: TQuestionResult;
    feature_tooltips: { [key: string]: string };
    feature_units: { [key: string]: string };
    feature_names: TFeatureName[];
}

type TQuestionResult = {
    general_questions: TGeneralQuestion[];
    feature_questions: TFeatureQuestion[];
};

type TTestOrTeaching = 'test' | 'teaching' | 'final-test' | 'intro-test';

type TInteractiveOrStatic = 'static' | 'interactive' | 'chat';

export type {
    TChatMessage,
    TDatapointResult,
    TDatapoint,
    TFeatureName,
    TFeatureQuestion,
    TGeneralQuestion,
    TInitResult,
    TQuestionResult,
    TTestOrTeaching,
    StaticReport,
    TInteractiveOrStatic,
    PredictionProbability
}