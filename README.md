# dialogue_xai_frontend - intro für dimi

## Installation

### Requirements

- node version 18.14.1

### How to run

1. npm install (after every pull plsss)
2. start the backend (python server)
3. npm run dev

## Settings

- create `.env` (see `.env.template`) file in root directory and set
    - PUBLIC_TEACH_TEST_CYCLES=10
    - PUBLIC_END_TEST_CYCLES=10
    - PUBLIC_DATASET_NAME=adult # Dataset Name
    - PUBLIC_A_B_SELECTION=interactive # Condition to run (static or interactive)
    - database connection info...

## Problems

### backend endpoint is hardcoded

The backend endpoint is hardcoded in the file `/src/lib/settings.ts` -> BACKEND. `localhost` sometimes does not work, so
I set it to my machines IP address. If you want to run it on your machine, you have to change it to your IP address. The
python app prints the IP address when it starts.
