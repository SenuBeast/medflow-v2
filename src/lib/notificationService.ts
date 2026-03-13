/**
 * Utility service for handling Browser Notifications.
 */

export const notificationService = {
    /**
     * Checks if the browser supports notifications.
     */
    isSupported(): boolean {
        return 'Notification' in window;
    },

    /**
     * Gets the current permission state.
     */
    getPermissionState(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission;
    },

    /**
     * Requests permission from the user to show notifications.
     */
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied';
        
        // Some older browsers use a callback instead of a promise
        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch {
            // Fallback for older Safari

            return new Promise((resolve) => {
                Notification.requestPermission((permission) => {
                    resolve(permission);
                });
            });
        }
    },

    /**
     * Shows a notification if permission is granted.
     */
    async show(title: string, options?: NotificationOptions) {
        if (!this.isSupported() || this.getPermissionState() !== 'granted') {
            return;
        }

        return new Notification(title, {
            icon: '/favicon.ico', // Default icon path
            ...options
        });
    }
};
