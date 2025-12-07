# Python Dependency Analyzer Pro 🛡️

Enterprise-grade dependency analysis with ISO 42001, GDPR & EU AI Act compliance.

## Features

- **Risk Assessment**: 8-factor risk scoring algorithm
- **CVE Detection**: Vulnerability database integration
- **Maintenance Tracking**: Monitor package maintenance status
- **Community Analysis**: Evaluate project community support
- **Compliance**: ISO 42001, GDPR, and EU AI Act ready
- **Multi-tier Caching**: Memory + LocalStorage for performance
- **Transitive Dependencies**: Track nested dependencies
- **PDF Reports**: Generate detailed compliance reports

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Development Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types
- `npm run test` - Run tests
- `npm run test:coverage` - Generate coverage report
- `npm run validate` - Run all validation checks

## Project Structure

```
src/
├── components/           # React components
│   ├── DependencyAnalyzer/
│   └── shared/
├── config/              # Configuration files
│   ├── risk.config.ts
│   ├── api.config.ts
│   └── compliance.config.ts
├── services/            # Business logic
│   ├── api/
│   ├── analysis/
│   ├── compliance/
│   └── export/
├── hooks/               # React hooks
├── utils/               # Utilities
│   ├── cache/
│   ├── i18n/
│   └── validators/
├── types/               # TypeScript types
└── main.tsx             # Entry point
```

## API Integration

- **PyPI**: Package information and releases
- **GitHub**: Repository metrics and activity
- **CVE**: Vulnerability data (CIRCL)

## Configuration

See `.env.example` for environment variables:

```env
VITE_PYPI_API_URL=https://pypi.org/pypi
VITE_GITHUB_API_URL=https://api.github.com
VITE_CVE_API_URL=https://cve.circl.lu/api
VITE_GITHUB_TOKEN=your_token_here
```

## License

MIT

## Authors

Julie Colleoni
