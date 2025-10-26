'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Owned, Lease } from '@/lib/schema';

interface DataContextType {
  owned: Owned[];
  leases: Lease[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [owned, setOwned] = useState<Owned[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ownedResponse, leasesResponse] = await Promise.all([
        fetch('/api/owned'),
        fetch('/api/leases')
      ]);

      if (!ownedResponse.ok || !leasesResponse.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const ownedData = await ownedResponse.json();
      const leasesData = await leasesResponse.json();

      setOwned(ownedData.data || []);
      setLeases(leasesData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const value: DataContextType = {
    owned,
    leases,
    loading,
    error,
    refetch: fetchData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

