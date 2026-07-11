const https = require('https');
const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'AcervoGamer/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
            });
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function extractSteamAppId(url) {
    const match = url.match(/\/app\/(\d+)\//);
    return match ? match[1] : null;
}

async function getSteamPrice(appId) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=br&filters=price_overview`;
    const data = await fetch(url);
    if (data && data[appId] && data[appId].success && data[appId].data.price_overview) {
        const p = data[appId].data.price_overview;
        return { price: p.final / 100, priceOriginal: p.final_formatted };
    }
    return null;
}

async function searchGame(title) {
    const query = encodeURIComponent(title);
    const url = `https://www.cheapshark.com/api/1.0/games?title=${query}&limit=5&exact=0`;
    return await fetch(url);
}

async function getGameDeals(gameId) {
    const url = `https://www.cheapshark.com/api/1.0/games?id=${gameId}&expires=0`;
    return await fetch(url);
}

function toBRL(usd) {
    return Math.round(usd * 5.80 * 100) / 100;
}

const PC_STORES = {
    2: { name: 'GamersGate', platform: 'PC' },
    3: { name: 'GreenManGaming', platform: 'PC' },
    7: { name: 'GOG', platform: 'PC' },
    11: { name: 'Humble Bundle', platform: 'PC' },
    13: { name: 'Uplay', platform: 'PC' },
    15: { name: 'Fanatical', platform: 'PC' },
    21: { name: 'WinGameStore', platform: 'PC' },
    23: { name: 'GameBillet', platform: 'PC' },
    25: { name: 'Epic Games Store', platform: 'PC' },
    27: { name: 'Gamesplanet', platform: 'PC' },
    28: { name: 'Gamesload', platform: 'PC' },
    30: { name: 'IndieGala', platform: 'PC' },
    35: { name: 'DreamGame', platform: 'PC' },
};

async function processGame(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const game = JSON.parse(raw);
    const gameName = game.name;
    const existingStores = game.stores || [];

    console.log(`\n--- ${gameName} ---`);

    // 1. Steam via Steam API (preço regional BRL)
    const steamStore = existingStores.find(s => s.store === 'Steam');
    if (steamStore) {
        const appId = extractSteamAppId(steamStore.url);
        if (appId) {
            try {
                const sp = await getSteamPrice(appId);
                if (sp) {
                    steamStore.price = sp.price;
                    steamStore.priceOriginal = sp.priceOriginal;
                    steamStore.lastUpdated = new Date().toISOString().split('T')[0];
                    console.log(`  Steam: R$${sp.price.toFixed(2)} (${sp.priceOriginal})`);
                } else {
                    console.log(`  Steam: preço não disponível`);
                }
            } catch (e) {
                console.log(`  Steam: erro - ${e.message}`);
            }
            await sleep(300);
        }
    }

    // 2. Eneba via Steam API (mesmo appId da Steam)
    const enebaStore = existingStores.find(s => s.store === 'Eneba');
    const steamAppId = extractSteamAppId(steamStore?.url || '');
    if (enebaStore && steamAppId) {
        try {
            const ep = await getSteamPrice(steamAppId);
            if (ep) {
                enebaStore.price = ep.price;
                enebaStore.priceOriginal = ep.priceOriginal;
                enebaStore.lastUpdated = new Date().toISOString().split('T')[0];
                console.log(`  Eneba: R$${ep.price.toFixed(2)} (${ep.priceOriginal})`);
            }
        } catch (e) {
            console.log(`  Eneba: erro - ${e.message}`);
        }
        await sleep(300);
    }

    // 3. Outras lojas PC via CheapShark (USD, convertido)
    let gameInfo = null;
    try {
        const games = await searchGame(gameName);
        if (games && games.length > 0) gameInfo = games[0];
    } catch (e) {
        console.log(`  CheapShark busca: ${e.message}`);
    }

    let cheapDeals = [];
    if (gameInfo) {
        try {
            const details = await getGameDeals(gameInfo.gameID);
            if (details && details.deals) cheapDeals = details.deals;
        } catch (e) {
            console.log(`  CheapShark deals: ${e.message}`);
        }
        await sleep(300);
    }

    const cheapByStore = {};
    for (const deal of cheapDeals) cheapByStore[deal.storeID] = deal;

    for (const [storeId, storeInfo] of Object.entries(PC_STORES)) {
        const deal = cheapByStore[storeId];
        const existing = existingStores.find(s => s.store === storeInfo.name);
        const coupon = existing?.coupon || null;

        if (deal) {
            const salePrice = parseFloat(deal.price);
            const retailPrice = parseFloat(deal.retailPrice);
            if (isNaN(salePrice) || salePrice <= 0) continue;

            const directUrl = existing?.url || `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`;
            const hasDiscount = retailPrice > salePrice;
            const entry = {
                store: storeInfo.name,
                url: directUrl,
                platform: storeInfo.platform,
                price: toBRL(salePrice),
                priceOriginal: hasDiscount ? `$${retailPrice.toFixed(2)} USD` : null,
                coupon: coupon,
                lastUpdated: new Date().toISOString().split('T')[0]
            };
            const idx = existingStores.findIndex(s => s.store === storeInfo.name);
            if (idx >= 0) existingStores[idx] = entry;
            else existingStores.push(entry);
        }
    }

    // 4. Lojas de console (mantidas manuais)
    const consoleStores = existingStores.filter(s =>
        s.store !== 'Steam' && s.store !== 'Eneba' &&
        !Object.values(PC_STORES).some(ps => ps.name === s.store)
    );

    const allStores = [...existingStores.filter(s =>
        s.store === 'Steam' || s.store === 'Eneba' ||
        Object.values(PC_STORES).some(ps => ps.name === s.store)
    ), ...consoleStores];

    allStores.sort((a, b) => (a.price || 9999) - (b.price || 9999));

    game.stores = allStores;
    game._pricesUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(game, null, 4));
    console.log(`  Total: ${allStores.length} lojas salvas`);
}

async function main() {
    console.log('=== Atualização de preços ===');
    console.log(`Data: ${new Date().toISOString()}\n`);

    const files = fs.readdirSync(GAMES_DIR)
        .filter(f => f.endsWith('.json'));

    for (const file of files) {
        await processGame(path.join(GAMES_DIR, file));
    }

    console.log('\n=== Concluído ===');
}

main().catch(console.error);
