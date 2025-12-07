// Placeholder hook for language support
// This will be fully implemented later

export interface LanguageStrings {
  title: string;
  subtitle: string;
  name: string;
  country: string;
  license: string;
  risk: string;
  actions: string;
  viewGraph: string;
  remove: string;
  dependencies: string;
  generatePDF: string;
  [key: string]: string;
}

export const useLanguage = () => {
  const t: LanguageStrings = {
    title: 'Python Dependency Analyzer',
    subtitle: 'Enterprise-grade dependency analysis',
    name: 'Package Name',
    country: 'Country',
    license: 'License',
    risk: 'Risk',
    actions: 'Actions',
    viewGraph: 'View Dependencies',
    remove: 'Remove',
    dependencies: 'Dependencies',
    generatePDF: 'Generate PDF Report',
  };

  return { t };
};
