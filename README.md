# Gold & Silver Price - Web App

Web interface for the Gold & Silver Price COT Data application. This web app uses the same backend API as the mobile app.

## Features

- **Data Ingestion**: Fetch and ingest COT data from CFTC API
- **View Data**: Browse latest and historical COT data with date filtering
- **Trend Charts**: Visualize field trends with Highcharts
- **Price/Volume Overlay**: Add price and volume data to trend charts

## Getting Started

### Prerequisites

- **Node.js 18.17.0 or higher** (required for Next.js 14)
- npm or yarn

**Note**: If you have an older Node.js version, you can:
1. Use `nvm` (Node Version Manager) to install Node.js 18+
2. Or use `n` (Node version manager)
3. Or download from [nodejs.org](https://nodejs.org/)

To check your Node.js version:
```bash
node --version
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Highcharts** - Charting library
- **Backend API** - Same API as mobile app (`https://finance-backend-ou68.onrender.com/api/v1`)

## Project Structure

```
web-app/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/
│   ├── IngestionSection.tsx  # Data ingestion UI
│   ├── ViewDataSection.tsx   # Data viewing UI
│   └── TrendChart.tsx        # Chart component
├── lib/
│   └── api.ts          # API client functions
└── package.json
```

## API Endpoints Used

- `POST /cot/ingest` - Ingest COT data
- `GET /cot/commodity/{name}` - Get all data for commodity
- `GET /cot/commodity/{name}/date-range` - Get data by date range
- `GET /cot/commodity/{name}/latest` - Get latest data
- `GET /cot/commodity/{name}/trend/{field}` - Get trend data
- `GET /prices/historical/{symbol}` - Get historical price data

