// hooks/use-pos-tables.ts
import { useState, useEffect, useCallback } from "react";

interface SimpleTable {
  id: string;
  name: string;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  current_order_id?: string;
  occupied_by?: string;
  occupied_at?: string;
}

export function usePosTables() {
  const [occupiedTableIds, setOccupiedTableIds] = useState<string[]>([]);
  
  // Load occupied tables on mount
  useEffect(() => {
    const loadOccupiedTables = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        const tables: SimpleTable[] = JSON.parse(stored);
        const occupied = tables
          .filter(t => t.status === "occupied" || t.status === "reserved")
          .map(t => t.id);
        setOccupiedTableIds(occupied);
      }
    };
    
    loadOccupiedTables();
    
    // Listen for storage changes
    const handleStorageChange = () => loadOccupiedTables();
    window.addEventListener("storage", handleStorageChange);
    
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  
  const updateTableOccupancy = useCallback(async (
    tableIds: string[], 
    orderId: string, 
    customerName?: string
  ) => {
    try {
      const stored = localStorage.getItem("simple-tables");
      if (!stored) return;
      
      const tables: SimpleTable[] = JSON.parse(stored);
      const updatedTables = tables.map(table => {
        if (tableIds.includes(table.id)) {
          return {
            ...table,
            status: "occupied" as const,
            current_order_id: orderId,
            occupied_by: customerName,
            occupied_at: new Date().toISOString()
          };
        }
        return table;
      });
      
      localStorage.setItem("simple-tables", JSON.stringify(updatedTables));
      
      // Update occupied table IDs
      const newOccupied = updatedTables
        .filter(t => t.status === "occupied")
        .map(t => t.id);
      setOccupiedTableIds(newOccupied);
      
      // Dispatch storage event for other components
      window.dispatchEvent(new StorageEvent("storage", {
        key: "simple-tables",
        newValue: JSON.stringify(updatedTables)
      }));
      
    } catch (error) {
      console.error("Error updating table occupancy:", error);
    }
  }, []);
  
  const releaseTableOccupancy = useCallback(async (tableIds: string[]) => {
    try {
      const stored = localStorage.getItem("simple-tables");
      if (!stored) return;
      
      const tables: SimpleTable[] = JSON.parse(stored);
      const updatedTables = tables.map(table => {
        if (tableIds.includes(table.id)) {
          return {
            ...table,
            status: "available" as const,
            current_order_id: undefined,
            occupied_by: undefined,
            occupied_at: undefined
          };
        }
        return table;
      });
      
      localStorage.setItem("simple-tables", JSON.stringify(updatedTables));
      
      // Update occupied table IDs
      const newOccupied = updatedTables
        .filter(t => t.status === "occupied")
        .map(t => t.id);
      setOccupiedTableIds(newOccupied);
      
      // Dispatch storage event
      window.dispatchEvent(new StorageEvent("storage", {
        key: "simple-tables",
        newValue: JSON.stringify(updatedTables)
      }));
      
    } catch (error) {
      console.error("Error releasing table occupancy:", error);
    }
  }, []);
  
  return {
    occupiedTableIds,
    updateTableOccupancy,
    releaseTableOccupancy
  };
}