
'use server';
/**
 * @fileOverview An AI agent for processing event-driven automations.
 *
 * - runAutomations - Checks device data against defined automation triggers.
 * - RunAutomationsInput - The input type for the runAutomations function.
 * - RunAutomationsOutput - The output type for the runAutomations function.
 */
import {z} from 'genkit';
import {ai} from '@/ai/index';

/**
 * Note: This flow is designed for event-driven automations, which are not
 * yet fully implemented in the UI. The current UI only supports time-based
 * automations. This flow serves as the backend foundation for that future feature.
 */

// Define the structure for a single automation rule
const AutomationRuleSchema = z.object({
  id: z.string(),
  // Trigger configuration
  triggerDeviceId: z.string(),
  triggerVariable: z.string(),
  triggerCondition: z.enum(['above', 'below', 'equals']),
  triggerValue: z.union([z.string(), z.number(), z.boolean()]),
  // Action configuration
  actionDeviceId: z.string(),
  actionDeviceHardwareId: z.string(),
  actionVariable: z.string(),
  actionValue: z.union([z.string(), z.number(), z.boolean()]),
});

// Input for the main flow: the current device data and a list of all possible automation rules
export const RunAutomationsInputSchema = z.object({
  deviceData: z.record(z.any()).describe('A JSON object of the data just received from a device. e.g., {"temperature": 35, "humidity": 60}'),
  deviceId: z.string().describe('The ID of the device that sent the data.'),
  allAutomations: z.array(AutomationRuleSchema).describe("A list of all automation rules configured in the system."),
});
export type RunAutomationsInput = z.infer<typeof RunAutomationsInputSchema>;


// Output: a list of commands that need to be sent via MQTT
const MqttCommandSchema = z.object({
  topic: z.string().describe("The MQTT topic to publish to, e.g., 'devices/device-001/commands'"),
  payload: z.string().describe('The JSON string payload to send.'),
});

export const RunAutomationsOutputSchema = z.object({
  commandsToRun: z.array(MqttCommandSchema),
});
export type RunAutomationsOutput = z.infer<typeof RunAutomationsOutputSchema>;


/**
 * Processes device data against a set of automation rules and determines which commands to run.
 * @param input The device data and the list of all automation rules.
 * @returns A promise that resolves to a list of MQTT commands to publish.
 */
export async function runAutomations(input: RunAutomationsInput): Promise<RunAutomationsOutput> {
  const { output } = await runAutomationsFlow(input);
  return output || { commandsToRun: [] };
}


const prompt = ai.definePrompt({
  name: 'runAutomationsPrompt',
  input: {schema: RunAutomationsInputSchema},
  output: {schema: RunAutomationsOutputSchema},
  prompt: `You are an IoT automation engine. Your task is to determine if incoming data from a device should trigger any automated actions.

You will be given the data payload from the triggering device and a list of all available automation rules in the system.

Analyze the incoming \`deviceData\` for device \`{{{deviceId}}}\`. Compare this data against the 'trigger' portion of each rule in the \`allAutomations\` array.

For each automation rule where the trigger condition is met by the incoming device data, you must formulate a command for the action device as specified in the rule.

A trigger is met if:
- The \`triggerDeviceId\` in the rule matches the ID of the device that sent the data.
- The specified \`triggerVariable\` exists in the incoming data.
- The value of that variable meets the \`triggerCondition\` when compared to the \`triggerValue\`.
  - 'above': incoming value > rule value
  - 'below': incoming value < rule value
  - 'equals': incoming value == rule value

For each triggered action, create an MQTT command object. The command's topic should be 'devices/\{actionDeviceHardwareId\}/commands'. The payload should be a JSON string containing the action, like '{"\{actionVariable\}": \{actionValue\}}'.

**Example:**
If incoming data from 'sensor-1' is \`{"temperature": 31}\` and a rule says "IF temperature on sensor-1 is above 30, THEN set 'fan_on' on 'actuator-5' to true", you should generate a command for 'actuator-5'.

If no rules are triggered, return an empty array for \`commandsToRun\`.

**Triggering Device ID:** {{{deviceId}}}
**Incoming Data:**
\`\`\`json
{{{json deviceData}}}
\`\`\`

**All Automation Rules:**
\`\`\`json
{{{json allAutomations}}}
\`\`\`

Evaluate all rules and return the list of MQTT commands to execute.`,
});

const runAutomationsFlow = ai.defineFlow(
  {
    name: 'runAutomationsFlow',
    inputSchema: RunAutomationsInputSchema,
    outputSchema: RunAutomationsOutputSchema,
  },
  async (input) => {
    // In a real implementation, you might filter automations here for efficiency
    if (input.allAutomations.length === 0) {
      return { commandsToRun: [] };
    }
    
    const { output } = await prompt(input);
    return output || { commandsToRun: [] };
  }
);
