
/**
 * @fileoverview This file configures and initializes the Genkit AI agent
 * for the Nuvion IoT platform.
 */
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {NextRequest} from 'next/server';

// Import flows so that they are registered with the AI system.
import './flows/process-edge-event-flow';
import './flows/run-automations-flow';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  // Log developer-friendly error messages to the console.
  logLevel: 'debug',
  // Omit OpenTelemetry options to prevent build errors in Next.js.
});
