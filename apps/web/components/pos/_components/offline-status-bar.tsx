'use client'

import { medusaOfflineDB } from '@/lib/db/medusa-offline-db';
import { medusaSyncManager } from '@/lib/offline/medusa-sync-manager';
import { useEffect, useState } from 'react';


export function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    medusaSyncManager.onStatusChange(setIsOnline);
    
    const updatePending = async () => {
      const pending = await medusaOfflineDB.getPendingQueue();
      setPendingSyncCount(pending.length);
    };
    
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await medusaSyncManager.startSync();
    setIsSyncing(false);
  };

  return (
    <div className={cn(
      "sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-sm border-b",
      isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"
    )}>
      <div className="flex items-center gap-2">
        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
        <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
      </div>
      <div className="flex items-center gap-3">
        {pendingSyncCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <span>{pendingSyncCount} pending sync</span>
          </Badge>
        )}
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={handleSync}
          disabled={isSyncing || !isOnline}
          className="h-8"
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          <span className="ml-2">Sync</span>
        </Button>
      </div>
    </div>
  );
}
