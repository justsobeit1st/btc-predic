# Bitcoin Prediction Markets Dashboard

A React dashboard for exploring Bitcoin prediction markets on Polymarket.

## Features

- 📊 **Live Market Data**: Real-time Bitcoin prediction markets from Polymarket
- 💰 **Price Tracking**: BTC price and 24h changes from CoinGecko
- 📈 **Analytics**: Market sentiment, resolution history, volume trends
- 🎨 **Dark Theme**: Professional crypto-themed UI
- 🔄 **Multiple Data Sources**: Direct API or demo data

## Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

Production files are in the `dist/` folder.

### Deploy to GitHub Pages

```bash
npm run deploy
```

Make sure to set your GitHub Pages source to `gh-pages` branch in repository settings.

## Project Structure

```
├── index.html          # HTML entry point
├── src/
│   ├── main.jsx       # React app bootstrap
│   └── App.jsx        # Main component
├── package.json       # Dependencies
├── vite.config.js     # Build configuration
└── .gitignore         # Git ignore rules
```

## Data Sources

### Demo Mode
Shows sample Bitcoin prediction markets for testing and exploration.

### Direct API Mode
Fetches live data from:
- **Polymarket**: `https://gamma-api.polymarket.com/markets`
- **CoinGecko**: `https://api.coingecko.com/api/v3/simple/price`

## Technologies

- **React 18**: UI framework
- **Vite**: Build tool
- **Recharts**: Data visualization
- **CSS-in-JS**: Inline styling

## Features

### Tabs

1. **Active Markets**: Live prediction markets
2. **History**: Resolved markets with outcomes
3. **Analytics**: Volume, sentiment, and resolution statistics

### Market Information

- Market question
- YES probability
- Trading volume
- End date
- Resolution status (for resolved markets)

## Browser Support

- Chrome/Edge (Latest)
- Firefox (Latest)
- Safari (Latest)

## License

MIT

## Support

For issues or suggestions, please create an issue on GitHub.
