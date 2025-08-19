import type { Notification } from '@/lib/types';

// In-memory store for notifications for the current session
let notifications: Notification[] = [];

// Custom event to notify components of updates
const dispatchUpdateEvent = () => {
    window.dispatchEvent(new CustomEvent('notifications-updated'));
}

/**
 * Adds a new notification to the in-memory store and dispatches an event.
 * @param message The notification message.
 * @param deviceId The ID of the related device, if any.
 */
export const addNotification = (message: string, deviceId?: string) => {
    const newNotification: Notification = {
        id: `notif-${crypto.randomUUID()}`,
        deviceId: deviceId || '',
        message: message,
        timestamp: Date.now(),
        read: false,
    };

    notifications = [newNotification, ...notifications].slice(0, 50); // Keep last 50
    dispatchUpdateEvent();
};

/**
 * Returns all current notifications.
 */
export const getNotifications = (): Notification[] => {
    return notifications;
};


/**
 * Marks all notifications as read in the in-memory store.
 */
export const markNotificationsAsRead = () => {
    notifications = notifications.map(n => ({ ...n, read: true }));
    dispatchUpdateEvent();
};

/**
 * Clears all notifications from the in-memory store.
 */
export const clearAllNotifications = () => {
    notifications = [];
    dispatchUpdateEvent();
};
