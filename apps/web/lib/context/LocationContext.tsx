// contexts/LocationContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserLocation } from '@/types';

interface LocationContextType {
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation) => void;
  isLocationSet: boolean;
  showLocationDialog: boolean;
  setShowLocationDialog: (show: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);

  useEffect(() => {
    // Check if location is already stored in localStorage
    const storedLocation = localStorage.getItem('userLocation');
    console.log(storedLocation, 'STRRE')
    if (storedLocation) {
      setUserLocation(JSON.parse(storedLocation));
    } else {
      // Show dialog if no location is stored
      setShowLocationDialog(true);
    }
  }, []);

  const handleSetUserLocation = (location: UserLocation) => {
    setUserLocation(location);
    localStorage.setItem('userLocation', JSON.stringify(location));
    setShowLocationDialog(false);
  };

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        setUserLocation: handleSetUserLocation,
        isLocationSet: !!userLocation,
        showLocationDialog,
        setShowLocationDialog,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};