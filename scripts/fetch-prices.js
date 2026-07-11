const https = require('https');
const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');
const USD_TO_BRL = 5.80;

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AcervoGamer/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error('JSON parse error')); }
            });
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function searchGame(title) {
    const query = encodeURIComponent(title);
    const url = `https://www.cheapshark.com/api/1.0/games?title=${query}&limit=5&exact=0`;
    const games = await fetch(url);
    if (!games || games.length === 0) return null;
    return games[0];
}

async function getGameDeals(gameId) {
    const url = `https://www.cheapshark.com/api/1.0/games?id=${gameId}&expires=0`;
    return await fetch(url);
}

function toBRL(usd) {
    return Math.round(usd * USD_TO_BRL * 100) / 100;
}

const PC_STORES = {
    1: { name: 'Steam', platform: 'PC' },
    7: { name: 'GOG', platform: 'PC' },
    11: { name: 'Humble Bundle', platform: 'PC' },
    13: { name: 'Uplay', platform: 'PC' },
    15: { name: 'Fanatical', platform: 'PC' },
    21: { name: 'WinGameStore', platform: 'PC' },
    23: { name: 'GameBillet', platform: 'PC' },
    24: { name: 'Voidu', platform: 'PC' },
    25: { name: 'JoyBuggy', platform: 'PC' },
    27: { name: 'Gamesplanet', platform: 'PC' },
    28: { name: 'Gamesload', platform: 'PC' },
    29: { name: '2Game', platform: 'PC' },
    30: { name: 'IndieGala', platform: 'PC' },
    31: { name: 'Blizzard', platform: 'PC' },
    33: { name: 'DLGamer', platform: 'PC' },
    34: { name: 'Noctre', platform: 'PC' },
    35: { name: 'DreamGame', platform: 'PC' },
};

async function processGame(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const game = JSON.parse(raw);
    const gameName = game.name;
    const gameSlug = game.slug;
    const existingStores = game.stores || [];

    console.log(`Buscando preços para: ${gameName}`);

    let gameInfo = null;
    try {
        gameInfo = await searchGame(gameName);
    } catch (e) {
        console.log(`  Erro ao buscar ${gameName}: ${e.message}`);
    }

    let cheapDeals = [];
    if (gameInfo) {
        console.log(`  Encontrado no CheapShark (ID: ${gameInfo.gameID}), buscando ofertas...`);
        try {
            const details = await getGameDeals(gameInfo.gameID);
            if (details && details.deals) {
                cheapDeals = details.deals;
            }
        } catch (e) {
            console.log(`  Erro ao buscar deals: ${e.message}`);
        }
        await sleep(200);
    }

    const stores = [];
    const cheapByStore = {};
    for (const deal of cheapDeals) {
        cheapByStore[deal.storeID] = deal;
    }

    for (const storeId of Object.keys(PC_STORES)) {
        const deal = cheapByStore[storeId];
        const storeInfo = PC_STORES[storeId];
        const existing = existingStores.find(s => s.store === storeInfo.name);
        const coupon = existing?.coupon || null;

        if (deal) {
            const salePrice = parseFloat(deal.salePrice);
            const normalPrice = parseFloat(deal.normalPrice);
            stores.push({
                store: storeInfo.name,
                url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
                platform: storeInfo.platform,
                price: toBRL(salePrice),
                priceOriginal: `$${salePrice}`,
                coupon: coupon,
                lastUpdated: new Date().toISOString().split('T')[0]
            });
        } else if (existing && existing.price > 0) {
            stores.push(existing);
        }
    }

    const consoleStores = existingStores.filter(s =>
        !Object.values(PC_STORES).some(ps => ps.name === s.store)
    );
    for (const cs of consoleStores) {
        stores.push(cs);
    }

    stores.sort((a, b) => (a.price || 9999) - (b.price || 9999));

    game.stores = stores;
    game._pricesUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(game, null, 4));
    console.log(`  Salvo ${stores.length} lojas em ${path.basename(filePath)}`);
}

async function main() {
    console.log('=== Atualizando preços ===');
    console.log(`Câmbio USD->BRL: ${USD_TO_BRL}`);

    const files = fs.readdirSync(GAMES_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json');

    for (const file of files) {
        await processGame(path.join(GAMES_DIR, file));
    }

    console.log('=== Concluído ===');
}

main().catch(console.error);
