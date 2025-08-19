
'use server';

import mqtt from 'mqtt';
import { z } from 'zod';

const commandSchema = z.object({
  deviceId: z.string(),
  command: z.record(z.any()),
});

// This action connects to the MQTT broker and publishes a command.
// It's a server action, so it runs securely on the server.
export async function publishMqttCommand(
  input: z.infer<typeof commandSchema>
) {
  const validation = commandSchema.safeParse(input);
  if (!validation.success) {
    console.error('Invalid input for publishMqttCommand:', validation.error);
    return { success: false, error: 'Invalid input.' };
  }

  const { deviceId, command } = validation.data;

  const brokerUrl = process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  if (!brokerUrl) {
    console.error('MQTT_BROKER_URL is not set.');
    return { success: false, error: 'MQTT broker is not configured.' };
  }

  const options: mqtt.IClientOptions = {
    clientId: `server-action-${Date.now()}`,
    reconnectPeriod: 1000, // Try to reconnect every second
  };
  
  // Only add credentials if they exist
  if (username) {
    options.username = username;
  }
  if (password) {
    options.password = password;
  }


  try {
    console.log(`Connecting to MQTT broker at ${brokerUrl} to publish a command...`);
    const client = await mqtt.connectAsync(brokerUrl, options);
    console.log('Connected to MQTT broker to publish command.');

    const commandTopic = `devices/${deviceId}/commands`;
    const commandPayload = JSON.stringify(command);

    await client.publish(commandTopic, commandPayload);
    console.log(`Published to ${commandTopic}: ${commandPayload}`);

    await client.endAsync();
    console.log('Disconnected from MQTT broker.');

    return { success: true, message: 'Command published successfully.' };
  } catch (error: any) {
    console.error('Failed to publish MQTT command:', error);
    return { success: false, error: `Failed to publish: ${error.message}` };
  }
}
