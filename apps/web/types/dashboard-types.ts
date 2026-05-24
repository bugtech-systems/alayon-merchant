// types/index.ts
export type UserRole = 'admin' | 'user' | 'company' | 'driver';

// Actor types supported by Medusa V2 [citation:7]

// Authentication provider types
export type AuthProvider = "emailpass";


export interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
  children?: SidebarItem[];
}

// types/auth.ts
export type ActorType = 'company' | 'driver';

export interface ActorUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  actor_type: ActorType;
  company_id?: string; // For drivers, reference to their company
  role?: 'admin' | 'manager' | 'driver'; // Role within the actor type
  metadata?: Record<string, any>;
}

export interface AuthState {
  user: ActorUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  actor_type?: ActorType;
}



export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  avatar?: string;
  actorType?: ActorType;
  metadata?: Record<string, any>;
}

