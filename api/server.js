import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

// ---- Simple cache (10s) ----
let cache = {
  markets: null,
  btc: null,
  ts: 0,
};

// ---- Fetch helper with retry ----
async function safeFetch(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Failed after retries");
}

// ---- Markets ----
app.get("/api/markets", async (req, res) => {
  try {
    if (cache.markets && Date.now() - cache.ts < 10000) {
      return res.json(cache.markets);
    }

    const data = await safeFetch(
      "https://gamma-api.polymarket.com/markets?tag_slug=crypto&limit=100&active=true"
    );

    cache.markets = data;
    cache.ts = Date.now();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- BTC price ----
app.get("/api/btc", async (req, res) => {
  try {
    if (cache.btc && Date.now() - cache.ts < 10000) {
      return res.json(cache.btc);
    }

    const data = await safeFetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"
    );

    cache.btc = data;
    cache.ts = Date.now();

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
