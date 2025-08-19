# **App Name**: IoT Central

## Core Features:

- Real-time Data Display: Display live data from connected IoT devices (Arduino, ESP32, etc.).
- Dashboard: Show a dashboard for displaying real-time updates without manual refresh. Device Management page to view API endpoint.
- Device Management: Offer a Device Management page where users can create a new device, generate its API key.
- API Authentication: Utilize APIs with unique keys to authenticate devices when sending data via WebSocket, MQTT, or REST.
- Boolean controls: Represent boolean statuses as toggle switches.
- Status Indicator: Display state labels for water level HIGH/LOW.
- Dark/Light Mode Toggle: Implement a dark mode toggle for switching between light and dark themes.

## Style Guidelines:

- Primary color: Cyan (#00FFFF) for a modern, techy feel.
- Background color: Light gray (#F0F0F0), almost white, to ensure that a light theme is enforced by default.
- Accent color: Electric Blue (#7DF9FF) to highlight interactive elements.
- Font: 'Inter' (sans-serif) for both headlines and body text. Note: currently only Google Fonts are supported.
- Use Lucide Icons for a clean and consistent look.
- Implement a clean, card-based layout for each device.
- Employ smooth animations for status changes, card transitions, and chart updates to enhance the user experience.