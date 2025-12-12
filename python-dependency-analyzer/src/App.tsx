import React, { Suspense } from 'react';
import { DependencyAnalyzer } from './components/DependencyAnalyzer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PackageAnalysis from './components/PackageAnalysis/PackageAnalysis';
import { DependencyProvider } from './contexts/DependencyContext';
import { useLanguage } from './hooks/use_language_hook';
const PackageAlternative = React.lazy(() => import('./components/PackageAlternative/PackageAlternative'));

function App() {
  const { t, isLoading } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <p className="text-lg text-gray-600">{t.messages.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <DependencyProvider>
        <BrowserRouter>
          <div className="bg-white shadow p-4 mb-4">
            <div className="max-w-7xl mx-auto flex gap-4">
              <Link to="/" className="px-3 py-2 rounded bg-indigo-100 hover:bg-indigo-200">{t.navigation.home}</Link>
              <Link to="/package-analysis" className="px-3 py-2 rounded bg-indigo-100 hover:bg-indigo-200">{t.navigation.packageAnalysis}</Link>
              <Link to="/package-alternative" className="px-3 py-2 rounded bg-indigo-100 hover:bg-indigo-200">{t.navigation.packageAlternative}</Link>
            </div>
          </div>

          <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-lg text-gray-600">{t.messages.loading}</p>
              </div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<DependencyAnalyzer />} />
              <Route path="/package-analysis" element={<PackageAnalysis />} />
                <Route path="/package-alternative" element={
                  <React.Suspense fallback={<div>{t.messages.loading}</div>}>
                    <PackageAlternative />
                  </React.Suspense>
                } />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DependencyProvider>
    </ErrorBoundary>
  );
}

export default App;
