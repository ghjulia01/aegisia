import { Suspense } from 'react';
import { DependencyAnalyzer } from './components/DependencyAnalyzer';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-lg text-gray-600">Chargement...</p>
          </div>
        </div>
      }>
        <DependencyAnalyzer />
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
