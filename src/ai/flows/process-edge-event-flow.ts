
'use server';
/**
 * @fileOverview An Edge AI agent for processing and analyzing IoT device events.
 *
 * This flow analyzes data from an edge device to detect anomalies, predict faults,
 * and provide optimization suggestions.
 *
 * - processEdgeEvent - A function that handles the event analysis.
 * - ProcessEdgeEventInput - The input type for the processEdgeEvent function.
 */

import {ai} from '@/ai/index';
import {z} from 'genkit';

export const ProcessEdgeEventInputSchema = z.object({
  deviceId: z.string().describe('The unique identifier for the device.'),
  deviceName: z.string().describe('The human-readable name of the device.'),
  deviceData: z.record(z.any()).describe('A JSON object representing the data payload from the device. e.g., {"temperature": 35, "fan_speed": 2000}'),
  deviceHistory: z.array(z.record(z.any())).describe('An array of recent historical data points to provide context for trends.'),
});
export type ProcessEdgeEventInput = z.infer<typeof ProcessEdgeEventInputSchema>;


/**
 * Processes an event from an edge device to detect anomalies and suggest actions.
 * @param input The device event data.
 * @returns A promise that resolves to a notification message.
 */
export async function processEdgeEvent(input: ProcessEdgeEventInput): Promise<string> {
  const { output } = await processEdgeEventFlow(input);
  return output?.notification || "No action required at this time.";
}

const prompt = ai.definePrompt({
  name: 'processEdgeEventPrompt',
  input: {schema: ProcessEdgeEventInputSchema},
  output: {schema: z.object({ notification: z.string().describe("A concise, human-readable notification message based on the event. Example: 'Anomaly detected on Main Pump: High vibration levels observed.'") })},
  prompt: `You are an expert AI monitoring system for an IoT platform called Nuvion IoT.
You will receive a data payload from an edge device, along with some of its recent history.
Your task is to analyze this data to perform three functions:
1.  **Anomaly Detection:** Compare the current data to the historical data. Identify any readings that are unusual spikes, dips, or deviations from the established pattern.
2.  **Fault Prediction:** Based on any detected anomalies or trends, predict potential upcoming hardware or system faults. For example, a rising temperature trend might predict an overheating failure.
3.  **Optimization Suggestion:** If applicable, suggest a preventative action or optimization. For example, if a fan is running at max speed but temperature is still high, suggest checking for blockages.

Analyze the following data for device: {{{deviceName}}} (ID: {{{deviceId}}}).

**Current Data Payload:**
\`\`\`json
{{{json deviceData}}}
\`\`\`

**Recent Historical Data (for trend context):**
\`\`\`json
{{{json deviceHistory}}}
\`\`\`

Based on your analysis, generate a single, concise notification message to send to the user.
- If a significant anomaly or potential fault is detected, the message MUST start with "Alert:", "Warning:", or "Fault Prediction:".
- If a minor anomaly or optimization is suggested, start with "Notice:" or "Optimization:".
- If everything appears normal and no action is needed, output the phrase "OK".

The notification should be clear, direct, and immediately understandable to a non-technical user.
Example: "Alert: Main Pump temperature is critically high (95°C), exceeding normal range. Overheating fault is imminent."
Example: "Optimization: Greenhouse humidity is low. Recommend activating the mister system."
`,
});

const processEdgeEventFlow = ai.defineFlow(
  {
    name: 'processEdgeEventFlow',
    inputSchema: ProcessEdgeEventInputSchema,
    outputSchema: z.object({ notification: z.string() }),
  },
  async (input) => {
    const { output } = await prompt(input);
    if (output?.notification === 'OK') {
        return { notification: "" }; // Return empty if everything is normal
    }
    return { notification: output?.notification || "Analysis complete." };
  }
);
