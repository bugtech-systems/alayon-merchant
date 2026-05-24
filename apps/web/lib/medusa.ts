// lib/medusa.ts




// Actor types supported by Medusa V2 [citation:7]
export type ActorType = "user" | "customer" | "vendor" | "manager" | string;

// Authentication provider types
export type AuthProvider = "emailpass" | "google" | "github";

// Session management helpers
export const getSessionToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Cookies are automatically managed by the browser with 'session' auth type
    // This is just a helper to check if we have a session indicator
    return localStorage.getItem('medusa_session_active');
  }
  return null;
};

export const setSessionActive = (isActive: boolean) => {
  if (typeof window !== 'undefined') {
    if (isActive) {
      localStorage.setItem('medusa_session_active', 'true');
    } else {
      localStorage.removeItem('medusa_session_active');
    }
  }
};

export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('medusa_session_active');
    localStorage.removeItem('medusa_user');
  }
};

// Store user data locally for quick access
export const storeUserData = (user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('medusa_user', JSON.stringify(user));
  }
};

export const getStoredUser = (): User | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('medusa_user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
  }
  return null;
};