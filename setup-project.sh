#!/bin/bash

# ==========================================
# Aegisia - Python Dependency Analyzer - Setup Script
# ==========================================

echo "Setting up Aegisia - Python Dependency Analyzer Pro..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js $(node --version) detected"

# Create project directory structure
echo -e "\n${BLUE} Creating project structure...${NC}"

mkdir -p src/{components/{DependencyAnalyzer,shared},services/{api,analysis,compliance,export},hooks,utils/{i18n,cache,validators},types,config,constants}
mkdir -p public
mkdir -p tests/{unit,integration,e2e}

echo -e "${GREEN}✓${NC} Directory structure created"

# Create essential configuration files
echo -e "\n${BLUE}⚙️  Creating configuration files...${NC}"

# TypeScript config
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Vite config
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
})
EOF

# ESLint config
cat > .eslintrc.cjs << 'EOF'
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}
EOF

# Prettier config
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Production
dist
build

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.swp
*.swo
*~

# Vite
.vite
EOF

# .env.example
cat > .env.example << 'EOF'
# API Configuration
VITE_PYPI_API_URL=https://pypi.org/pypi
VITE_GITHUB_API_URL=https://api.github.com
VITE_CVE_API_URL=https://cve.circl.lu/api

# Optional: GitHub Token for higher rate limits
VITE_GITHUB_TOKEN=

# Caching
VITE_CACHE_TTL=3600
VITE_ENABLE_CACHE=true
EOF

echo -e "${GREEN}✓${NC} Configuration files created"

# Create placeholder files
echo -e "\n${BLUE}📝 Creating placeholder files...${NC}"

# Main entry point
cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# App component
cat > src/App.tsx << 'EOF'
import { DependencyAnalyzer } from './components/DependencyAnalyzer'

function App() {
  return <DependencyAnalyzer />
}

export default App
EOF

# Basic CSS
cat > src/index.css << 'EOF'
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.btn-primary {
  background: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.risk-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
  color: white;
  font-size: 0.875rem;
}

.risk-1 { background: #22c55e; }
.risk-2 { background: #3b82f6; }
.risk-3 { background: #eab308; }
.risk-4 { background: #f97316; }
.risk-5 { background: #ef4444; }

.status-banner {
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}
EOF

# HTML template
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/shield.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Enterprise Python Dependency Analyzer with ISO 42001, GDPR & EU AI Act compliance" />
    <title>Python Dependency Analyzer Pro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create types index
cat > src/types/index.ts << 'EOF'
export * from './Dependency';
EOF

# Create config index
cat > src/config/index.ts << 'EOF'
export * from './risk.config';
export * from './api.config';
export * from './compliance.config';
EOF

# API config
cat > src/config/api.config.ts << 'EOF'
export const API_CONFIG = {
  pypi: {
    baseUrl: import.meta.env.VITE_PYPI_API_URL || 'https://pypi.org/pypi',
    timeout: 10000,
  },
  github: {
    baseUrl: import.meta.env.VITE_GITHUB_API_URL || 'https://api.github.com',
    token: import.meta.env.VITE_GITHUB_TOKEN,
    timeout: 10000,
  },
  cve: {
    baseUrl: import.meta.env.VITE_CVE_API_URL || 'https://cve.circl.lu/api',
    timeout: 10000,
  },
} as const;
EOF

echo -e "${GREEN}✓${NC} Placeholder files created"

# Create README
cat > README.md << 'EOF'
# Aegisia - Python Dependency Analyzer Pro 🛡️

Enterprise-grade dependency analysis with ISO 42001, GDPR & EU AI Act compliance.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Documentation

See `/docs` folder for detailed documentation.

## License

MIT
EOF

echo -e "\n${GREEN} Project setup complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Copy the individual file contents from the artifacts"
echo "2. Run: ${BLUE}npm install${NC}"
echo "3. Run: ${BLUE}npm run dev${NC}"
echo "4. Open http://localhost:3000"

echo -e "\n${BLUE} Files to copy manually:${NC}"
echo "   - src/types/Dependency.ts"
echo "   - src/config/risk.config.ts"
echo "   - src/services/api/PyPIClient.ts"
echo "   - src/utils/cache/CacheManager.ts"
echo "   - src/services/analysis/RiskCalculator.ts"
echo "   - package.json"
echo ""
echo "   See the artifacts for their content!"

echo -e "\n${GREEN}Happy coding! ${NC}"