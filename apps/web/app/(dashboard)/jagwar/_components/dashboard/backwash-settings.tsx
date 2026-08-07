// components/dashboard/backwash-settings.tsx
"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Settings2, RotateCcw, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BACKWASH_STORAGE_KEY = 'water-dashboard-backwash-limit';

interface BackwashSettingsProps {
  currentCount: number;
  lastBackwashDate: Date | null;
  onUpdateLimit: (limit: number) => Promise<void>;
  onBackwash: () => Promise<void>;
}

export function BackwashSettings({ 
  currentCount, 
  lastBackwashDate, 
  onUpdateLimit, 
  onBackwash 
}: BackwashSettingsProps) {
  const [backwashLimit, setBackwashLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(BACKWASH_STORAGE_KEY);
      return stored ? parseInt(stored) : 250;
    }
    return 250;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempLimit, setTempLimit] = useState(backwashLimit);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Sync to localStorage whenever limit changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKWASH_STORAGE_KEY, backwashLimit.toString());
    }
  }, [backwashLimit]);

  const progressPercentage = (currentCount / backwashLimit) * 100;
  const isBackwashNeeded = currentCount >= backwashLimit;
  const isApproachingLimit = progressPercentage >= 80 && !isBackwashNeeded;

  const handleUpdateLimit = async () => {
    if (tempLimit < 1) {
      toast({
        title: "Invalid Limit",
        description: "Backwash limit must be at least 1.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await onUpdateLimit(tempLimit);
      setBackwashLimit(tempLimit);
      setIsEditing(false);
      toast({
        title: "Limit Updated",
        description: `Backwash limit set to ${tempLimit} bottles.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update backwash limit.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackwashConfirm = async () => {
    setIsLoading(true);
    try {
      await onBackwash();
      setShowConfirmDialog(false);
      toast({
        title: "Backwash Completed",
        description: "Machine has been backwashed successfully. Counter reset.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record backwash.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeSinceLastBackwash = () => {
    if (!lastBackwashDate) return null;
    const hours = Math.floor((Date.now() - new Date(lastBackwashDate).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Less than 1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Backwash Settings
            </span>
            {isBackwashNeeded ? (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Action Required
              </Badge>
            ) : isApproachingLimit ? (
              <Badge variant="secondary">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Approaching Limit
              </Badge>
            ) : (
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Normal
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Visualization */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-3xl font-bold">{currentCount}</div>
                <div className="text-sm text-muted-foreground">Current Count</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-muted-foreground">/ {backwashLimit}</div>
                <div className="text-sm text-muted-foreground">Limit</div>
              </div>
            </div>
<Progress 
  value={Math.min(progressPercentage, 100)} 
  className={`h-3 ${
    isBackwashNeeded ? "bg-red-100" : 
    isApproachingLimit ? "bg-yellow-100" : 
    "bg-blue-100"
  }`}
  indicatorClassName={
    progressPercentage >= 100 ? "bg-red-500" :
    progressPercentage >= 80 ? "bg-yellow-500" :
    progressPercentage >= 50 ? "bg-blue-500" :
    "bg-green-500"
  }
/>
          </div>

          {/* Status Messages */}
          <div className="space-y-2">
            {isBackwashNeeded && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Backwash Required</p>
                  <p className="text-red-500">
                    Production limit exceeded. Backwash before continuing production.
                  </p>
                </div>
              </div>
            )}
            
            {isApproachingLimit && (
              <div className="flex items-start gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Approaching Limit</p>
                  <p className="text-yellow-500">
                    {backwashLimit - currentCount} bottles remaining before backwash is required.
                  </p>
                </div>
              </div>
            )}

            {lastBackwashDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last backwash: {getTimeSinceLastBackwash()}</span>
              </div>
            )}
          </div>

          {/* Limit Editor */}
          <div className="space-y-3 pt-2 border-t">
            <Label>Backwash Limit</Label>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  value={tempLimit}
                  onChange={(e) => setTempLimit(parseInt(e.target.value) || 0)}
                  min="1"
                  max="10000"
                  className="text-lg"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpdateLimit} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={() => {
                      setTempLimit(backwashLimit);
                      setIsEditing(false);
                    }} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  setTempLimit(backwashLimit);
                  setIsEditing(true);
                }} 
                variant="outline" 
                className="w-full"
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Change Limit ({backwashLimit})
              </Button>
            )}
          </div>

          {/* Backwash Button */}
          <Button 
            onClick={() => setShowConfirmDialog(true)} 
            variant={isBackwashNeeded ? "destructive" : "secondary"}
            className="w-full h-12 text-base"
            disabled={currentCount === 0}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Perform Backwash
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Confirm Backwash
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current Count:</span>
                  <span className="font-medium">{currentCount} bottles</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Backwash Limit:</span>
                  <span className="font-medium">{backwashLimit} bottles</span>
                </div>
                {lastBackwashDate && (
                  <div className="flex justify-between text-sm">
                    <span>Last Backwash:</span>
                    <span className="font-medium">{getTimeSinceLastBackwash()}</span>
                  </div>
                )}
              </div>
              
              <div className="text-sm space-y-1">
                <p className="font-medium">This action will:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Reset the production counter to zero</li>
                  <li>Record the backwash in the system log</li>
                  <li>Update the last backwash timestamp</li>
                  <li>Allow new production to resume</li>
                </ul>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                Are you sure you want to proceed with the backwash?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBackwashConfirm}
              disabled={isLoading}
              className={isBackwashNeeded ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Backwash
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}