import { formatDistanceToNow, format } from 'date-fns';
import { useState, useEffect } from 'react';

// Component for auto-updating time
export const TimeFromNow = ({ date }: any) => {
  const [timeAgo, setTimeAgo] = useState('');
  
  useEffect(() => {
    if (!date) return;
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return;
    
    const updateTime = () => {
      setTimeAgo(formatDistanceToNow(dateObj, { addSuffix: true }));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [date]);
  
  if (!timeAgo) return <span className="text-muted-foreground">—</span>;
  
  return (
    <div className="flex flex-col">
      <span className="font-medium">{timeAgo}</span>
      <span className="text-xs text-muted-foreground">
        {format(new Date(date), 'MMM dd, h:mm a')}
      </span>
    </div>
  );
};