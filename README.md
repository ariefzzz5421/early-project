# Genesis Atlas — Early Ethereum Archive

A searchable, independently designed research interface for the public historical datasets linked by [goatishduck.com](https://www.goatishduck.com/).

## Live application

**Production website:** https://early-project-gray.vercel.app/\n\nThis repo deploys as a static site on Vercel from the connected `main` branch (no build command or environment variables needed).

## Imported source datasets

| Source | Research records indexed | Original spreadsheet |
| --- | ---: | --- |
| Early Ethereum Contracts | 2,432 | [Contracts + Ownable, Coin, NFT, Other tabs](https://docs.google.com/spreadsheets/d/1r-SDx4V-DHsQQfRltFHI3tU_oPIZ-YOrcHGZdHcKQgs/edit) |
| Early Ethereum Coins | 11 | [Coins](https://docs.google.com/spreadsheets/d/1-mZRSdvs0-royMN9t2f9ZgRiOifN7d3wnLng8Elge90/edit) |
| Early Ethereum NFTs | 61 | [NFTs](https://docs.google.com/spreadsheets/d/19vbNZyta0Vfkfw8FtEQmvZkfOtiuTarLqdX7V9XvBEw/edit) |
| Early Ethereum TCOs | 40 | [TCOs](https://docs.google.com/spreadsheets/d/1j2hL6pnQBJWpqxFjLj-I2_4AY-HA_fkC49Qp46OAF3Q/edit) |

**Snapshot:** 2026-10-22. This is an attributed, static research archive, not a real-time blockchain index. Counts refer to entries with valid EVM contract addresses, excluding the source spreadsheets' explanatory/disclaimer rows. Records and classifications remain attributable to the original researchers; this app is an independent visual interface.

### Implementation

- `index.html` — semantic, accessible responsive UI.
- `styles.css` — dark archival design with mobile layout.
- `app.js` — client-side search, filter, sort, pagination, timeline, CSV export, and details.
- `data/contracts.json` — 2,432 main contract records (all fields except bytecode).
- `data/ownable.json`, `data/coin-contracts.json`, `data/nft-contracts.json`, `data/other-contracts.json` — full annotations from the four additional original contract tabs.
- `data/bytecode/*.json` — the original contract bytecode, split into 10 lazy-loaded archives for performance. All contracts have an on-demand bytecode viewer in the details drawer.
- `data/coins.json`, `data/nfts.json`, `data/tcos.json` — archived rows plus the original hyperlink destinations where supplied (Trade / Website).
- `vercel.json` — static response headers.

No third-party data API key required at runtime. Files can be inspected and served locally:

```bash
python3 -m http.server 3000
# Visit http://localhost:3000
```

For source updates, repeat the Google Sheets export process and regenerate the `data/*.json` snapshots from the original sheets. **Deploying this website does not automatically update the dataset**.

## Research integrity

- Each contract links to its address on Etherscan and the exact original research spreadsheet.
- TCO means tokenized collectible object in the source; it is not presented as an official ERC standard.
- Archived trading links or historical supply figures are not endorsements, indications of safety, or live liquidity data.
- Public source: [goatishduck.com](https://www.goatishduck.com/).
- Original spreadsheet notes and classifications are preserved as historical research material.

## License

Website source uses the repository's MIT license. The imported third-party archival datasets are attributed to their original source; this repository does not claim ownership of them.


## Trade terminal — /trade

The **Trade** entry below Early TCOs opens a dedicated onchain market-intelligence interface.

- **Token discovery:** `api/market-tokens.js` requests Ethereum trading pools using DEX Screener's documented batch API. The site checks the source-listed coins and fungible TCOs first, then progressively scans all 2,432 original contract addresses (up to 120 contracts per page). Only exact contract addresses are matched; it never guesses from a ticker or name. The token table distinguishes market cap from FDV, labels historic vs wrapped/related trade addresses, and sorts by market cap, USD price, 24h volume or liquidity.
- **NFT discovery:** `api/market-nfts.js` merges historical NFT and nonfungible-TCO entries, deduplicates by contract, uses pre-existing source-linked OpenSea collection slugs where available, and tries OpenSea's contract resolver for unlinked entries. OpenSea collection stats supply the floor, floor currency, 24h volume/currency, all-time volume, and sales. **Source-linked collections may wrap or represent a different onchain contract**; labels do not claim identity verification.
- **Automatic market checks:** Opening the Trade route starts the paginated scans. Refresh re-runs them with a minimum cooldown. DEX data is CDN-cached approximately 4 minutes; NFT data approximately 9 minutes. The archive's own classification is still a historical snapshot from October 22, 2026; new spreadsheet rows are **not** ingested automatically.
- **Market availability:** A DEX pair counts as active only when liquidity or 24h volume is positive; an NFT collection counts as active when OpenSea reports a positive floor or 24h volume. No provider value means **unavailable**, not zero. `Active only` can be disabled to see archived records without confirmed live trading.
- **Direct marketplace links:** The Trade view links to DEX Screener, source-provided token trade links, Etherscan, and OpenSea when a collection has an original/source-linked or contract-resolved URL.

### API and deployment setup

No DEX Screener API key is required. OpenSea does require an API key. On first use, the server-side route attempts to obtain a temporary OpenSea **instant free-tier key** through their documented `POST /api/v2/auth/keys` endpoint, and refreshes after expiry while the same server process is available. In production, **configure `OPENSEA_API_KEY` as an encrypted Vercel environment variable** for dependable OpenSea access, avoiding temporary key-generation rate limits. Never put the key in frontend code or commit it to GitHub.

If OpenSea refuses authorization, the site still displays verified source-provided OpenSea links but marks floor and volume **unavailable**. Live data and marketplace listing availability have not been claimed without a successful API response.

Source API references: [DEX Screener API](https://docs.dexscreener.com/api/reference) · [OpenSea stats](https://docs.opensea.io/reference/get_collection_stats) · [OpenSea API keys](https://docs.opensea.io/reference/api-keys).

### Route and function health

- `/trade` → static app route configured in `vercel.json`.
- `/api/market-tokens?scope=curated` → archival coin/TCO DEX markets.
- `/api/market-tokens?scope=archive&page=0` → first 120 historical contract-address checks (page index 0–20).
- `/api/market-nfts?page=0` → NFT/OpenSea checks (9 original records per page).

All live API endpoints return `checkedAt`, explicit provider errors, and no invented market numbers. DEX Screener and OpenSea API rate limits remain applicable. An API check does not constitute a token legitimacy or liquidity safety audit.
