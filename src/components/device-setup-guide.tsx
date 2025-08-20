
"use client"
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ArrowLeft, ArrowRight, Copy, Lightbulb, Wifi, HardDrive, CheckCircle, Terminal, Loader2, MessageSquareQuote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from '@/lib/utils';
import type { PairingToken } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const CodeBlock = ({ children, language = 'cpp' }: { children: React.ReactNode, language?: string }) => {
    const { toast } = useToast();
    const handleCopy = () => {
        if (typeof children === 'string') {
            navigator.clipboard.writeText(children);
            toast({ title: "Code Copied", description: "The example code has been copied." });
        }
    };
    return (
        <div className="relative my-4">
             <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={handleCopy}
            >
                <Copy className="h-4 w-4" />
            </Button>
            <pre className="p-4 rounded-md bg-muted text-sm overflow-x-auto w-full">
                <code className={`font-mono text-muted-foreground language-${language}`}>{children}</code>
            </pre>
        </div>
    );
};

const arduinoPnpCode = (hostname: string) => `
/*
 * =================================================================
 * Nuvion IoT - ESP32 MQTT Plug & Play - v2.0
 * =================================================================
 * This code provides a complete one-shot provisioning process.
 *
 * HOW IT WORKS:
 * 1. It first connects to your WiFi.
 * 2. It uses a temporary Pairing Token to talk to the platform
 *    over HTTPS and securely fetch a permanent API Key.
 * 3. It then immediately uses that new API Key to connect to your
 *    own Mosquitto MQTT broker and starts sending data.
 *
 * INSTRUCTIONS:
 * 1. Update the "USER CONFIGURATION" section below with your
 *    WiFi and Mosquitto broker details.
 * 2. Upload this code to your ESP32.
 * 3. Open the Serial Monitor (baud rate 115200).
 * 4. When prompted, enter the Pairing Token from the dashboard.
 *
 * The device will then be fully provisioned and online.
 *
 * Required Libraries (Install via Arduino Library Manager):
 * - ArduinoJson v6+
 * - PubSubClient (by Nick O'Leary)
 */
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// ======================= USER CONFIGURATION =======================
// --- WiFi Credentials ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// --- Mosquitto Broker Configuration ---
// Your Mosquitto broker's IP address or domain name
const char* MQTT_BROKER = "YOUR_MQTT_BROKER_IP_OR_DOMAIN"; 
const int   MQTT_PORT   = 1883; // Or 8883 for TLS/SSL
const char* MQTT_USER   = "YOUR_MQTT_USERNAME";
const char* MQTT_PASS   = "YOUR_MQTT_PASSWORD";

// --- Platform Configuration ---
// This is the hostname of your deployed dashboard application
const char* SERVER_HOSTNAME = "${hostname}";
// =======================================================================


// --- Global Variables ---
String apiKey = "";
String deviceId = "";

// --- Hardware Setup ---
const int LED_PIN = 2; // Built-in LED on most ESP32 boards

// --- MQTT and Network Clients ---
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// --- MQTT Topics ---
char data_topic[100];
char command_topic[100];

// --- Timers ---
unsigned long lastMsg = 0;
long lastReconnectAttempt = 0;


// ======================= MQTT Functions =======================

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\\0';
  Serial.println(message);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  if (doc.containsKey("light")) {
    bool light_on = doc["light"];
    digitalWrite(LED_PIN, light_on ? HIGH : LOW);
    Serial.printf("Action: Set LED to %s\\n", light_on ? "ON" : "OFF");
  }
}

boolean mqtt_reconnect() {
  Serial.print("Attempting MQTT connection to Mosquitto broker...");
  
  String clientId = "esp32-client-";
  clientId += String(random(0xffff), HEX);
  
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("connected!");
    delay(1000);
    mqttClient.subscribe(command_topic);
    Serial.print("Subscribed to command topic: ");
    Serial.println(command_topic);
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" try again in 5 seconds");
    return false;
  }
}


// ======================= Pairing Functions =======================

String readSerialLine() {
  String str = "";
  while (true) {
    if (Serial.available()) {
      char c = Serial.read();
      if (c == '\\n' || c == '\\r') {
        if (str.length() > 0) break;
      } else {
        str += c;
      }
    }
    delay(10);
  }
  return str;
}

bool pairDevice(String token) {
  Serial.println("\\n--- Starting Device Pairing Process ---");
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: Not connected to WiFi. Cannot pair device.");
    return false;
  }
  
  HTTPClient http;
  WiFiClientSecure client;
  client.setInsecure(); // Bypass certificate validation for simplicity
  
  String serverUrl = "https://" + String(SERVER_HOSTNAME) + "/api/devices/pair";

  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  deviceId = WiFi.macAddress();
  doc["hardwareId"] = deviceId;
  doc["pairingToken"] = token;

  String requestBody;
  serializeJson(doc, requestBody);
  
  int httpResponseCode = http.POST(requestBody);
  
  if (httpResponseCode == 200) {
    String payload = http.getString();
    JsonDocument responseDoc;
    deserializeJson(responseDoc, payload);
    
    apiKey = responseDoc["apiKey"].as<String>();
    if (apiKey.length() > 0) {
      Serial.println("---- SUCCESS! ----");
      Serial.print("Received API Key: ");
      Serial.println(apiKey);
      Serial.println("Device is now paired. Proceeding to connect to Mosquitto broker.");
      http.end();
      return true;
    }
  }

  Serial.println("---- PAIRING FAILED! ----");
  Serial.printf("HTTP Response Code: %d\\n", httpResponseCode);
  String payload = http.getString();
  Serial.println("Server Response: " + payload);
  Serial.println("Please check the token, reboot the device, and try again.");
  http.end();
  return false;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  delay(1000);
  Serial.println("\\n\\n--- Nuvion IoT PnP Setup for Mosquitto ---");

  // 1. Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi...");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
  Serial.print("Device Hardware ID (MAC): ");
  Serial.println(WiFi.macAddress());

  // 2. Get Pairing Token from User
  Serial.print("Enter pairing token from dashboard: ");
  String token = readSerialLine();

  // 3. Pair Device and get API Key
  if (pairDevice(token)) {
    // 4. If pairing is successful, set up MQTT
    sprintf(data_topic, "devices/%s/data", deviceId.c_str());
    sprintf(command_topic, "devices/%s/commands", deviceId.c_str());

    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setBufferSize(512); 
    mqttClient.setCallback(mqtt_callback);
    lastReconnectAttempt = 0;
  } else {
    // Stop if pairing fails
    while(true) { delay(1000); }
  }
}

void loop() {
  // This part only runs after successful pairing
  if (!mqttClient.connected()) {
    long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (mqtt_reconnect()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    mqttClient.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > 10000 && mqttClient.connected()) {
    lastMsg = now;

    JsonDocument doc;
    doc["apiKey"] = apiKey;
    doc["light"] = (digitalRead(LED_PIN) == HIGH);
    doc["temperature"] = 20.0 + (random(0, 100) / 20.0);

    char output[256];
    serializeJson(doc, output);
    
    Serial.print("Publishing message to Mosquitto: ");
    Serial.println(output);
    mqttClient.publish(data_topic, output);
  }
  delay(10); 
}
`;

const pythonPnpCode = (apiUrl: string) => `
import requests
import json
import uuid
import sys

# ======================= IMPORTANT CONFIGURATION =======================
# This URL should point to your deployed application.
APP_URL = "${apiUrl}" 
# =======================================================================


# Your device's unique ID. The MAC address is a great choice.
def get_mac_address():
    mac_num = uuid.getnode()
    mac = ':'.join(('%012X' % mac_num)[i:i+2] for i in range(0, 12, 2))
    return mac

HARDWARE_ID = get_mac_address()

def pair_device():
    """
    Prompts for a pairing token and registers the device with the platform.
    """
    pairing_token = input("Please enter the pairing token from the dashboard: ")
    if not pairing_token:
        print("Pairing token cannot be empty.")
        return None

    print(f"Attempting to pair device with ID: {HARDWARE_ID}...")
    
    try:
        response = requests.post(
            f"{APP_URL}/api/devices/pair",
            json={
                "hardwareId": HARDWARE_ID,
                "pairingToken": pairing_token
            },
            timeout=15,
            verify=True 
        )

        response_data = response.json()
        print(f"Server response ({response.status_code}): {response_data}")

        if response.status_code == 200 and response_data.get("apiKey"):
            api_key = response_data.get("apiKey")
            print("---- SUCCESS! ----")
            print(f"Your new API Key is: {api_key}")
            
            # CRITICAL STEP: Save the API Key securely on your device.
            config_data = {
                "api_key": api_key, 
                "device_id": HARDWARE_ID,
                "mqtt_broker": "YOUR_MQTT_BROKER_IP_OR_DOMAIN",
                "mqtt_port": 1883,
                "mqtt_user": "YOUR_MQTT_USERNAME",
                "mqtt_pass": "YOUR_MQTT_PASSWORD"
            }
            with open("device_config.json", "w") as f:
                json.dump(config_data, f, indent=4)
            print("API Key and Mosquitto placeholders saved to device_config.json")
            print("IMPORTANT: You can now run your main application script.")
            return config_data

        else:
            error_msg = response_data.get('message', 'No error message provided.')
            print(f"---- PAIRING FAILED! ----")
            print(f"Info: {error_msg}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"An error occurred during pairing: {e}")
        return None

if __name__ == "__main__":
    try:
        with open("device_config.json", "r") as f:
            config = json.load(f)
            if "api_key" in config and config.get("api_key"):
                print("Device is already configured. Found API key in device_config.json.")
                print("To re-pair, please delete the device_config.json file.")
    except FileNotFoundError:
        print("No configuration found. Starting pairing process.")
        pair_device()
`;

const arduinoManualCode = (apiKey: string) => `
/* 
 * ===================================================================
 * Nuvion IoT - Mosquitto MQTT Example (ESP32) - v2.0
 * ===================================================================
 * This example demonstrates:
 * 1. Connecting to a self-hosted Mosquitto MQTT broker.
 * 2. Publishing sensor data every 10 seconds.
 * 3. Subscribing to a command topic to receive actions.
 *
 * This code assumes you have manually created a device profile in the
 * UI and have the API Key and Device ID.
 *
 * Required Libraries (Install via Arduino Library Manager):
 * - ArduinoJson (version 6 or higher)
 * - PubSubClient (by Nick O'Leary)
 */
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ======================= USER CONFIGURATION =======================
// --- WiFi Credentials ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// --- Mosquitto Broker Configuration ---
const char* MQTT_BROKER = "YOUR_MQTT_BROKER_IP_OR_DOMAIN"; 
const int   MQTT_PORT   = 1883; // Or 8883 for TLS/SSL
const char* MQTT_USER   = "YOUR_MQTT_USERNAME";
const char* MQTT_PASS   = "YOUR_MQTT_PASSWORD";

// --- Device Configuration ---
const char* API_KEY   = "${apiKey}"; 
const char* DEVICE_ID = "YOUR_UNIQUE_DEVICE_ID"; // e.g., MAC address
// ==================================================================

// --- Hardware Setup ---
const int LED_PIN = 2; // Built-in LED on most ESP32 boards

// --- MQTT and Network Clients ---
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// --- MQTT Topics ---
char data_topic[100];
char command_topic[100];

// --- Timers ---
unsigned long lastMsg = 0;
long lastReconnectAttempt = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\\0';
  Serial.println(message);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
    return;
  }

  // Example: Handle a "light" control command
  if (doc.containsKey("light")) {
    bool light_on = doc["light"];
    digitalWrite(LED_PIN, light_on ? HIGH : LOW);
    Serial.printf("Action: Set LED to %s\\n", light_on ? "ON" : "OFF");
  }
}

boolean reconnect() {
  Serial.print("Attempting MQTT connection to Mosquitto...");
  
  String clientId = "esp32-client-";
  clientId += String(random(0xffff), HEX);
  
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS)) {
    Serial.println("connected");
    delay(1000);
    mqttClient.subscribe(command_topic);
    Serial.print("Subscribed to: ");
    Serial.println(command_topic);
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(" try again in 5 seconds");
    return false;
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  randomSeed(micros());

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  sprintf(data_topic, "devices/%s/data", DEVICE_ID);
  sprintf(command_topic, "devices/%s/commands", DEVICE_ID);

  setup_wifi();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setBufferSize(512); 
  mqttClient.setCallback(callback);
  lastReconnectAttempt = 0;
}

void loop() {
  if (!mqttClient.connected()) {
    long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnect()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    mqttClient.loop();
  }

  unsigned long now = millis();
  if (now - lastMsg > 10000 && mqttClient.connected()) {
    lastMsg = now;

    JsonDocument doc;
    doc["apiKey"] = API_KEY;
    // The keys ('light', 'temperature') MUST match the 'Variable Name'
    // in the device profile you created in the UI.
    doc["light"] = (digitalRead(LED_PIN) == HIGH);
    doc["temperature"] = 20.0 + (random(0, 100) / 20.0);

    char output[256];
    serializeJson(doc, output);
    
    Serial.print("Publishing message to Mosquitto: ");
    Serial.println(output);
    mqttClient.publish(data_topic, output);
  }
  delay(10); 
}
`;

const pythonManualCode = (apiKey: string) => `
import paho.mqtt.client as mqtt
import json
import time
import random
import sys

try:
    with open("device_config.json", "r") as f:
        config = json.load(f)
except FileNotFoundError:
    print("Error: device_config.json not found.")
    print("Please run the Plug & Play script first or create the file manually with your credentials.")
    sys.exit(1)

# --- Configuration loaded from file ---
API_KEY = config.get("api_key", "${apiKey}")
DEVICE_ID = config.get("device_id", "YOUR_UNIQUE_DEVICE_ID")
MQTT_BROKER = config.get("mqtt_broker", "YOUR_MQTT_BROKER_IP_OR_DOMAIN")
MQTT_PORT = config.get("mqtt_port", 1883)
MQTT_USER = config.get("mqtt_user", "YOUR_MQTT_USERNAME")
MQTT_PASS = config.get("mqtt_pass", "YOUR_MQTT_PASSWORD")

# --- MQTT Topics ---
DATA_TOPIC = f"devices/{DEVICE_ID}/data"
COMMAND_TOPIC = f"devices/{DEVICE_ID}/commands"

# --- Main Application Logic ---

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Connected to Mosquitto Broker: {MQTT_BROKER}")
        client.subscribe(COMMAND_TOPIC)
        print(f"Subscribed to topic: {COMMAND_TOPIC}")
    else:
        print(f"Failed to connect, return code {rc}\\n")

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(f"Received message on topic {msg.topic}: {msg.payload.decode()}")
    try:
        payload = json.loads(msg.payload.decode())
        if "light" in payload:
            print(f"ACTION: Set light to {'ON' if payload['light'] else 'OFF'}")
            # Add your hardware control logic here (e.g., GPIO control)
    except json.JSONDecodeError:
        print("Error: Could not decode JSON payload.")

def publish_data(client):
    """Builds and publishes sensor data to the MQTT broker."""
    payload = {
        "apiKey": API_KEY,
        # The keys ('light', 'temperature') MUST match the 'Variable Name'
        # in the device profile you created in the UI.
        "light": False, # Replace with actual sensor reading
        "temperature": round(20.0 + random.uniform(0.0, 5.0), 2)
    }
    
    payload_str = json.dumps(payload)
    result = client.publish(DATA_TOPIC, payload_str)
    
    status = result[0]
    if status == 0:
        print(f"Sent {payload_str} to topic {DATA_TOPIC}")
    else:
        print(f"Failed to send message to topic {DATA_TOPIC}")

if __name__ == "__main__":
    if not all([API_KEY, DEVICE_ID, MQTT_BROKER, MQTT_PORT]):
        print("Configuration is missing from device_config.json. Please check the file.")
        sys.exit(1)

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"py-client-{random.randint(0, 1000)}")
    
    if MQTT_USER and MQTT_PASS:
        client.username_pw_set(MQTT_USER, MQTT_PASS)
        
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, MQTT_PORT)
    except Exception as e:
        print(f"Error connecting to MQTT broker: {e}")
        sys.exit(1)

    client.loop_start()

    try:
        while True:
            publish_data(client)
            time.sleep(10)
    except KeyboardInterrupt:
        print("Disconnecting from MQTT broker...")
        client.loop_stop()
        client.disconnect()
        print("Disconnected.")
`;

interface DeviceSetupGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'pnp' | 'manual';
    onGenerateToken: () => Promise<void>;
    isGeneratingToken: boolean;
    pairingToken: PairingToken | null;
    step: number;
    setStep: (step: number) => void;
}

export function DeviceSetupGuide({ open, onOpenChange, mode, onGenerateToken, isGeneratingToken, pairingToken, step, setStep }: DeviceSetupGuideProps) {
    const [appUrl, setAppUrl] = useState('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
           setIsLoadingUrl(true);
            fetch('/api/app-url')
                .then(res => res.json())
                .then(data => {
                    if (data.url) {
                        setAppUrl(data.url);
                    } else {
                         toast({ title: "Error", description: "Could not determine application URL.", variant: "destructive" });
                    }
                })
                .catch(err => console.error("Failed to fetch app URL:", err))
                .finally(() => setIsLoadingUrl(false));
        }
    }, [open, toast]);

    useEffect(() => {
        if (open && mode === 'pnp' && pairingToken) {
            setStep(1);
        } else if (open && mode === 'pnp' && !pairingToken) {
            setStep(0);
        }
    }, [pairingToken, open, mode, setStep]);

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Token Copied", description: "The pairing token has been copied." });
    };
    
    const CodeContent = ({ getCode, getPythonCode, lang }: { getCode: (val: string) => string, getPythonCode?: (val: string) => string, lang: 'cpp' | 'python'}) => {
        if (isLoadingUrl) {
            return (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            );
        }
        if (!appUrl && lang !== 'python') {
            return (
                <div className="text-center text-destructive p-4 border border-destructive/50 rounded-lg">
                    Could not load app URL. Please check your connection and try again.
                </div>
            );
        }

        const apiKey = mode === 'manual' ? 'iotc_your_api_key_from_the_ui' : '';

        if (lang === 'python' && getPythonCode) {
            return <CodeBlock language={lang}>{getPythonCode(appUrl)}</CodeBlock>;
        }
        
        const value = mode === 'manual' ? apiKey : appUrl.replace('https://', '').replace('http://', '');
        return <CodeBlock language={lang}>{getCode(value)}</CodeBlock>;
    }


    const PnpSteps = [
        {
            icon: Wifi,
            title: "Step 1: Generate Pairing Token",
            description: "First, your device needs a temporary token to securely introduce itself to our platform.",
            content: (
                 <div className="text-center w-full max-w-lg mx-auto">
                    <p className='text-muted-foreground'>Click the button below to generate a temporary, single-use token. This is used to link your physical device to your account without exposing your main credentials.</p>
                    <div className="my-6">
                        {pairingToken ? (
                             <Card className="p-4 rounded-lg bg-green-500/10 border-green-500/20">
                                <p className="text-sm text-green-700 dark:text-green-300">Active token found. Please proceed to the next step.</p>
                            </Card>
                        ) : (
                             <Button onClick={onGenerateToken} disabled={isGeneratingToken}>
                                {isGeneratingToken && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Pairing Token
                            </Button>
                        )}
                    </div>
                     <p className="text-sm text-muted-foreground">This dialog will advance automatically once a token is active.</p>
                </div>
            )
        },
        {
            icon: Terminal,
            title: "Step 2: Flash & Provision Device",
            description: "Use the Arduino Serial Monitor to send credentials directly to your device. This is the most reliable method for initial setup.",
            content: (
                 <div className='w-full'>
                    <p className="text-sm text-muted-foreground mb-4 text-center">This code will connect to your WiFi, use the token to get an API key, then immediately connect to your Mosquitto broker.</p>

                    {pairingToken && (
                        <Card className="p-4 rounded-lg bg-green-500/10 border-green-500/20 mb-4 max-w-md mx-auto">
                            <p className="text-sm text-green-700 dark:text-green-300 text-center">Use this active token when prompted in the Serial Monitor:</p>
                            <div className='flex items-center justify-center gap-2'>
                                <p className="text-3xl font-mono font-bold tracking-widest text-primary">{pairingToken.token}</p>
                                <Button variant="ghost" size="icon" onClick={() => handleCopyToClipboard(pairingToken.token)}>
                                <Copy className="h-5 w-5" />
                                </Button>
                            </div>
                             <p className="text-xs text-muted-foreground text-center">Expires in {Math.round(Math.max(0, (pairingToken.expires || 0) - Date.now()) / 60000)} minutes.</p>
                        </Card>
                    )}
                    <Tabs defaultValue="arduino">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="arduino">Arduino (ESP32)</TabsTrigger>
                            <TabsTrigger value="python">Python (RPi)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="arduino">
                             <p className="text-xs text-muted-foreground mb-2">First, edit the "USER CONFIGURATION" section in the code with your WiFi details. Then upload and open the Serial Monitor (115200 baud).</p>
                            <CodeContent getCode={arduinoPnpCode} lang="cpp" />
                        </TabsContent>
                        <TabsContent value="python">
                            <p className="text-xs text-muted-foreground mb-2">Run this script. It will prompt for the token, then create a `device_config.json` file. You can then use this file in your main application script.</p>
                             <CodeContent getCode={() => ""} getPythonCode={pythonPnpCode} lang="python" />
                        </TabsContent>
                    </Tabs>
                </div>
            )
        },
        {
            icon: CheckCircle,
            title: "Step 3: Device is Online!",
            description: "Your device is now registered and connected to your Mosquitto broker.",
            content: (
                 <div className="text-center p-6 border-2 border-dashed rounded-lg bg-background w-full">
                    <p>The previous step provisioned your device with a permanent <b className='text-primary'>API Key</b> and connected it to your broker.</p>
                    <p className='mt-4'>The device is automatically created with a default 'Smart Light' profile. You should now see it on your dashboard sending data.</p>
                    <p className="mt-4 text-sm text-muted-foreground">You can edit the device's profile (name, variables, icons, etc.) from the devices list at any time to match your hardware.</p>
                </div>
            )
        }
    ];

    const ManualSteps = [
        {
            icon: MessageSquareQuote,
            title: "Step 1: Get Mosquitto Broker Credentials",
            description: "This platform uses your self-hosted Mosquitto broker. You must have it running and accessible.",
            content: (
                 <div className="text-center w-full max-w-lg mx-auto">
                    <p className='text-muted-foreground'>To connect your devices, you need your Mosquitto broker's details:</p>
                     <ul className='text-primary my-4 font-semibold list-inside list-disc text-left ml-4'>
                        <li>Broker URL or IP Address</li>
                        <li>Broker Port (e.g., 1883 or 8883 for SSL)</li>
                        <li>Broker Username</li>
                        <li>Broker Password</li>
                     </ul>
                    <p className="text-sm text-muted-foreground">The code examples are pre-filled with placeholders that you must replace with your own broker's credentials.</p>
                </div>
            )
        },
        {
            icon: HardDrive,
            title: "Step 2: Create a Device Profile",
            description: "Manually define your device's profile in the UI, including all its sensors and controls.",
            content: (
                 <div className="text-center w-full max-w-lg mx-auto">
                    <p className='text-muted-foreground'>Click 'Create Device' on the Devices page to manually configure a virtual device. Define all the variables (sensors and controls) that your physical hardware has.</p>
                     <div className="my-4 p-4 border rounded-lg bg-muted/50">
                        <p className="font-semibold">Important Credentials</p>
                        <p className="text-sm text-muted-foreground">After creating the device, you will get an <b className='text-primary'>API Key</b> and <b className='text-primary'>Device ID</b> from the device list. You will use these in your device's firmware.</p>
                    </div>
                     <p className="text-sm text-muted-foreground">Remember, if you regenerate the key, you must update your device's firmware.</p>
                </div>
            )
        },
        {
            icon: Lightbulb,
            title: "Step 3: Flash Mosquitto Firmware",
            description: "Use the API Key and Mosquitto credentials to connect your device and start sending data.",
            content: (
                 <div className='w-full'>
                     <p className="text-sm text-muted-foreground mb-4 text-center">Your device will publish data to <code className='font-mono text-xs bg-muted p-1 rounded'>devices/YOUR_DEVICE_ID/data</code> and listen for commands on <code className='font-mono text-xs bg-muted p-1 rounded'>devices/YOUR_DEVICE_ID/commands</code>.</p>
                    <Tabs defaultValue="arduino">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="arduino">Arduino (C++)</TabsTrigger>
                            <TabsTrigger value="python">Python</TabsTrigger>
                        </TabsList>
                        <TabsContent value="arduino">
                            <p className="text-xs text-muted-foreground mb-2">Edit the "USER CONFIGURATION" section in the code with your credentials, then flash to your device.</p>
                            <CodeContent getCode={arduinoManualCode} lang="cpp" />
                        </TabsContent>
                        <TabsContent value="python">
                             <p className="text-xs text-muted-foreground mb-2">Create a `device_config.json` file with your credentials, or run the Plug & Play script first.</p>
                             <CodeContent getCode={() => ""} getPythonCode={pythonManualCode} lang="python" />
                        </TabsContent>
                    </Tabs>
                </div>
            )
        },
    ];

    const steps = mode === 'pnp' ? PnpSteps : ManualSteps;
    const currentStep = steps[step];
    const Icon = currentStep.icon;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
                 <DialogHeader>
                    <div className='flex justify-center items-center mb-4'>
                         <div className="p-3 rounded-full bg-primary/10 text-primary border">
                            <Icon className="h-8 w-8" />
                        </div>
                    </div>
                    <DialogTitle className='text-center text-2xl'>{currentStep.title}</DialogTitle>
                    <DialogDescription className='text-center max-w-2xl mx-auto'>
                        {currentStep.description}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex justify-center my-2">
                    {steps.map((_, i) => (
                        <div key={i} className={cn(
                            "h-1.5 w-12 mx-1 rounded-full",
                            i <= step ? "bg-primary" : "bg-muted"
                        )}></div>
                    ))}
                </div>

                <div className="py-6 px-2 overflow-y-auto flex-grow">
                    <div className="flex items-start justify-center min-h-full">
                       {currentStep.content}
                    </div>
                </div>

                <DialogFooter className="flex-shrink-0 justify-between w-full pt-4 border-t">
                    <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 0}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                    </Button>
                     {step < steps.length - 1 ? (
                         <Button onClick={() => setStep(step + 1)} disabled={mode === 'pnp' && step === 0 && !pairingToken}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                         <Button onClick={() => onOpenChange(false)} variant="default">
                            Finish
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
