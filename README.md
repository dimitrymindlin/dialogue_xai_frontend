# dialogue_xai_frontend

## Installation

### Requirements

- node version 18.14.1

### How to run

1. npm install (after every pull plsss)
2. start the backend (python server)
3. npm run dev

## Settings

- create `.env` (see `.env.template`) file in root directory

## Endpoints
- src/lib/backend.ts contains all the endpoints

## Main Components
- src/lib/routes/intro (contains the main components for the intro)
- src/lib/routes/experiment (contains the main components for the experiment)

## Study Flow
Three phases of the experiment:

![Study flow of the three experiment phases](docs/Study%20Flow.drawio.pdf)

If the image preview does not render, open the file directly: [Study Flow.drawio.pdf](docs/Study%20Flow.drawio.pdf)

## Explanation strategies
- **Static explanations** capture a fixed narrative about a model's behavior (e.g., feature importance tables, SHAP summaries). They are useful during design and validation when you want a snapshot of what the model is relying on without user interaction. Static explanations also work well for documentation or auditing the model once it is trained.
- **Interactive explanations** let analysts or end users explore different inputs, drill into explanations, and see how changes affect decisions. They are key for debugging, trust-building, and education, especially when domain experts want to validate outcomes in real time.
- **MAPE-K loops** (Monitor, Analyze, Plan, Execute with shared Knowledge) provide a control-plane explanation layer for systems that must adapt over time. Explanations are generated at each stage of the loop so operators can monitor drift, analyze policies, plan corrective actions, and execute updates while capturing the knowledge that informed past decisions.

## Use cases supported
- **Adult dataset** (income prediction) 
- **Diabetes progression** given indicators (e.g., BMI, glucose) predict risk of diabetes
