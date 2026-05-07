# Invoice App

A simple invoice creator built with React and Vite, supporting multiple businesses, templates, and currencies.

## Features

- Multiple business profiles (Dream World Fashion & Design School, Baby Hsu)
- 4 invoice templates: Modern, Classic, Minimal, Bold
- Multi-currency support: MMK, USD, THB, SGD, EUR
- Per-item and global discounts (percentage or flat)
- Tax rate calculation
- Payment method & notes
- Download invoice as PDF or PNG image

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm

### Install & Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
invoice-app/
├── invoice-app.jsx   # Main app component
├── main.jsx          # React entry point
├── index.html        # HTML shell
├── vite.config.js    # Vite configuration
└── package.json
```

## Tech Stack

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [html2canvas](https://html2canvas.hertzen.com/) — loaded on demand for image/PDF export
- [jsPDF](https://github.com/parallax/jsPDF) — loaded on demand for PDF export
