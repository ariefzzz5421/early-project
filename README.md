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
