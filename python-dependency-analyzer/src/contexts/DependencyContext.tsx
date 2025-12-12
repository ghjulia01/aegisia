import React, { createContext, useContext, ReactNode } from 'react';
import { useDependencyAnalysis } from '../hooks/use_dependency_analysis';

// Use the exact return type from useDependencyAnalysis
type DependencyContextValue = ReturnType<typeof useDependencyAnalysis>;

// Create the context
const DependencyContext = createContext<DependencyContextValue | undefined>(undefined);

// Provider component
export const DependencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dependencyAnalysis = useDependencyAnalysis();
  
  return (
    <DependencyContext.Provider value={dependencyAnalysis}>
      {children}
    </DependencyContext.Provider>
  );
};

// Custom hook to use the context
export const useDependencyContext = () => {
  const context = useContext(DependencyContext);
  if (context === undefined) {
    throw new Error('useDependencyContext must be used within a DependencyProvider');
  }
  return context;
};
