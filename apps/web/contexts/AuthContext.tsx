// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, AuthState, LoginCredentials, ActorType } from '@/types';
import { setSessionActive, clearSession, storeUserData, getStoredUser } from '@/lib/medusa';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, setAuthToken } from '@/lib/data/cookies';
import { n8nFetcher } from '@/hooks/useN8nQuery';
import { sdk } from '@/lib/config';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials, actorType: ActorType) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  getCurrentActor: () => ActorType | null;
  getCompanyId: () => string | null;
  refreshSession: () => Promise<boolean>;
  isCompany: () => boolean;
  isDriver: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';



// Session cache
class SessionCache {
  private static CACHE_KEY = 'auth_session_cache';
  private static SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

  static get(): { user: User | null; token: string | null; actorType: ActorType | null } | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      
      const session = JSON.parse(cached);
      
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.clear();
        return null;
      }
      
      return session;
    } catch {
      return null;
    }
  }

  static set(user: User | null, token: string | null, actorType: ActorType | null) {
    const session = {
      user,
      token,
      actorType,
      expiresAt: token ? Date.now() + this.SESSION_DURATION : null,
    };
    
    if (user && token) {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(session));
    } else {
      this.clear();
    }
  }

  static clear() {
    localStorage.removeItem(this.CACHE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [currentActorType, setCurrentActorType] = useState<ActorType | null>(null);
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session cache first
        const cachedSession = SessionCache.get();
        
        if (cachedSession?.user && cachedSession?.token) {
          setAuthState({
            user: cachedSession.user,
            isAuthenticated: true,
            isLoading: false,
          });
          setCurrentActorType(cachedSession.actorType);
          return;
        }

        if (DEMO_MODE) {
          const storedUser = getStoredUser();
          const sessionActive = localStorage.getItem('medusa_session_active') === 'true';
          
          if (sessionActive && storedUser) {
            setAuthState({
              user: storedUser as User,
              isAuthenticated: true,
              isLoading: false,
            });
            setCurrentActorType((storedUser as User).actorType);
          } else {
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
          return;
        }

        // Production - try to restore session from Medusa
        try {
          const { customer } = await sdk.store.customer.retrieve().catch(() => ({ customer: null }));
          
          if (customer) {
            const actorType = customer.metadata?.actor_type as ActorType;
            
            const user: User = {
              id: customer.id,
              email: customer.email,
              first_name: customer.first_name || '',
              last_name: customer.last_name || '',
              role: customer.metadata?.role || (actorType === 'driver' ? 'driver' : 'viewer'),
              actorType: actorType,
              companyId: customer.metadata?.company_id || '',
              companyName: customer.metadata?.company_name || '',
              permissions: customer.metadata?.permissions || [],
              driverId: customer.metadata?.driver_id,
              vehicleType: customer.metadata?.vehicle_type,
              licenseNumber: customer.metadata?.license_number,
            };
            
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            setCurrentActorType(actorType);
            return;
          }
        } catch (error) {
          console.log('No active session');
        }

        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        SessionCache.clear();
        
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        SessionCache.clear();
      }
    };

    checkAuth();
  }, []);

    const fetchAuthSession = async () => {
    try {
      
  //  let res = await apiFetch(
  //     `/webhook/auth/session`, { 
  //     method: "POST",
  //     // body: { email, password, actorType },
  //   })

    // console.log(res, 'rewee')

      const res = await n8nFetcher({"endpoint": "/webhook/auth/session", 
        method: "GET"
      })
      let user;
      //   const userData = await resUser.json() as any;
        if(res.user || res.customer || res.company || res.driver){
            user = {...(res.user || res.customer || res.company || res.driver), actor_type: res.actor_type};
        // storeUserData({...(res.user || res.customer || res.company || res.driver), actor_type: res.actor_type})
        }

        // fetchSession(res?.user?.id)
        return user
    } catch {
        return null
    } 
  }

  const login = async (credentials: LoginCredentials, actorType: ActorType) => {
    try {
        console.log(actorType, "ACTOR TYPE")
      // Production login
        const res = await n8nFetcher({"endpoint": "/webhook/auth", 
        method: "POST",
        body: {
            email: credentials.email,
            password: credentials.password,
            actorType: actorType
        }
      })
        console.log(res, 'RRRSSS')
     let token = await sdk.auth.login(actorType, 'emailpass', {
        email: credentials.email,
        password: credentials.password,
      }) as any;

      if(res.token){
          setAuthToken(res.token)
      }


      console.log(token, 'TOOKE')
      
  

       let customer = await fetchAuthSession()
       console.log(customer, 'ccccss')
    if (!customer) {
        throw new Error('Failed to retrieve customer data');
      }

      const user: User = {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        role: customer.metadata?.role || (actorType === 'driver' ? 'driver' : 'viewer'),
        actorType: actorType,
        companyId: customer.metadata?.company_id || '',
        companyName: customer.metadata?.company_name || '',
        permissions: customer.metadata?.permissions || (actorType === 'driver' 
          ? ['view_deliveries', 'update_delivery_status', 'view_routes']
          : ['view_products', 'view_customers']),
        driverId: customer.metadata?.driver_id,
        vehicleType: customer.metadata?.vehicle_type,
        licenseNumber: customer.metadata?.license_number,
      };

      const sessionToken = 'session_' + Date.now();
      SessionCache.set(user, sessionToken, actorType);
      setSessionActive(true);
      storeUserData(user);

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      setCurrentActorType(actorType);
      
      router.push(actorType === 'company' ? '/company/dashboard' : '/rider/dashboard');
      
    } catch (error: any) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      if (!DEMO_MODE) {
        try {
          await sdk.auth.logout();
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }
      
      SessionCache.clear();
      clearSession();
      
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      setCurrentActorType(null);
      
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      SessionCache.clear();
      clearSession();
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      setCurrentActorType(null);
      router.push('/login');
    }
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false;
    
    // Admin company users have all permissions
    if (authState.user.actorType === 'company' && authState.user.role === 'admin') {
      return true;
    }
    
    return authState.user.permissions?.includes(permission) || false;
  }, [authState.user]);

  const getCurrentActor = useCallback((): ActorType | null => {
    return currentActorType;
  }, [currentActorType]);

  const getCompanyId = useCallback((): string | null => {
    return authState.user?.companyId || null;
  }, [authState.user]);

  const isCompany = useCallback((): boolean => {
    return authState.user?.actorType === 'company';
  }, [authState.user]);

  const isDriver = useCallback((): boolean => {
    return authState.user?.actorType === 'driver';
  }, [authState.user]);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const cached = SessionCache.get();
      if (!cached?.token) return false;

      const { customer } = await sdk.store.customer.retrieve().catch(() => ({ customer: null }));
      
      if (customer && authState.user && customer.id === authState.user.id) {
        SessionCache.set(authState.user, cached.token, currentActorType);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return false;
    }
  }, [authState.user, currentActorType]);

  const contextValue = useMemo(() => ({
    ...authState,
    user: authState.user,
    login,
    logout,
    hasPermission,
    getCurrentActor,
    getCompanyId,
    refreshSession,
    isCompany,
    isDriver,
  }), [authState, login, logout, hasPermission, getCurrentActor, getCompanyId, refreshSession, isCompany, isDriver]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};