#!/usr/bin/env node

/**
 * download-songs.js
 * 
 * Downloads MP3 files for all soundtrack tracks in game JSONs using yt-dlp.
 * Skips tracks that already have an audioUrl in the JSON or an existing MP3 file.
 * Works for any game — just add a new JSON to data/games/ and run this script.
 * 
 * Usage:
 *   node scripts/download-songs.js                    # Download all missing songs
 *   node scripts/download-songs.js --game undertale   # Download only for one game
 *   node scripts/download-songs.js --dry-run          # Show what would be downloaded
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');
const SONGS_DIR = path.join(__dirname, '..', 'data', 'games', 'Songs');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const gameFilter = args.find((a, i) => args[i - 1] === '--game') || null;

function sanitizeFilename(str) {
    return str
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 80);
}

function getGameSlugs() {
    return fs.readdirSync(GAMES_DIR)
        .filter(f => f.endsWith('.json') && !f.startsWith('_'))
        .map(f => f.replace('.json', ''));
}

function loadGame(slug) {
    const filePath = path.join(GAMES_DIR, `${slug}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveGame(slug, data) {
    const filePath = path.join(GAMES_DIR, `${slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

function getYtDlpPath() {
    try {
        return execSync('which yt-dlp', { encoding: 'utf8' }).trim();
    } catch {
        try {
            const home = require('os').homedir();
            const localBin = path.join(home, '.local', 'bin', 'yt-dlp');
            if (fs.existsSync(localBin)) return localBin;
        } catch {}
        return 'yt-dlp';
    }
}

const YT_DLP = getYtDlpPath();
const CLIENTS = ['android', 'mweb', 'android_vr', 'tv_embedded'];
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

function downloadSong(youtubeUrl, outputPath) {
    for (let ci = 0; ci < CLIENTS.length; ci++) {
        const client = CLIENTS[ci];
        const cmd = `"${YT_DLP}" -x --audio-format mp3 --audio-quality 5 -o "${outputPath}" "${youtubeUrl}" --no-playlist --no-check-certificates --user-agent "${UA}" --extractor-args "youtube:player_client=${client}" 2>&1`;
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                execSync(cmd, { timeout: 180000 });
                return true;
            } catch (e) {
                const output = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
                const errLine = output.split('\n').find(l => l.trim().startsWith('ERROR:'));
                if (ci === CLIENTS.length - 1 && attempt === 2) {
                    console.error(`    ✗ Failed (${client}): ${errLine ? errLine.substring(0, 200) : 'unknown error'}`);
                }
                if (attempt < 2) execSync('sleep 2');
            }
        }
    }
    return false;
}

function getTrackKey(track) {
    return sanitizeFilename(`${track.artist} - ${track.title}`);
}

async function processGame(slug) {
    const game = loadGame(slug);
    const gameSongsDir = path.join(SONGS_DIR, slug);

    if (!game.soundtrack || game.soundtrack.length === 0) {
        console.log(`⏭  ${game.name}: no soundtrack, skipping`);
        return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
    }

    fs.mkdirSync(gameSongsDir, { recursive: true });

    let total = 0;
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;
    let updated = false;

    console.log(`\n🎵 ${game.name} (${game.soundtrack.length} tracks)`);
    console.log(`   Folder: ${gameSongsDir}`);

    for (let i = 0; i < game.soundtrack.length; i++) {
        const track = game.soundtrack[i];
        total++;

        if (!track.youtubeUrl) {
            console.log(`   [${i + 1}/${game.soundtrack.length}] ⏭  ${track.title} — no YouTube URL`);
            skipped++;
            continue;
        }

        const trackKey = getTrackKey(track);
        const expectedFile = path.join(gameSongsDir, `${trackKey}.mp3`);

        if (track.audioUrl && fs.existsSync(expectedFile)) {
            console.log(`   [${i + 1}/${game.soundtrack.length}] ✓  ${track.title} — already downloaded`);
            skipped++;
            continue;
        }

        if (dryRun) {
            console.log(`   [${i + 1}/${game.soundtrack.length}] 🔽 ${track.title} — would download`);
            downloaded++;
            continue;
        }

        console.log(`   [${i + 1}/${game.soundtrack.length}] 🔽 ${track.title}...`);

        const success = downloadSong(track.youtubeUrl, expectedFile);

        if (success && fs.existsSync(expectedFile)) {
            track.audioUrl = `data/games/Songs/${slug}/${trackKey}.mp3`;
            updated = true;
            downloaded++;
            console.log(`   [${i + 1}/${game.soundtrack.length}] ✓  ${track.title}`);
        } else {
            failed++;
            console.log(`   [${i + 1}/${game.soundtrack.length}] ✗  ${track.title} — download failed`);
        }

        await new Promise(r => setTimeout(r, 500));
    }

    if (updated && !dryRun) {
        saveGame(slug, game);
        console.log(`   💾 Updated ${slug}.json`);
    }

    return { total, downloaded, skipped, failed };
}

async function main() {
    console.log('🎵 Acervo Gamer — Song Downloader\n');
    console.log(`   Songs folder: ${SONGS_DIR}`);

    if (dryRun) {
        console.log('   Mode: DRY RUN (no downloads)\n');
    }

    let slugs = getGameSlugs();
    if (gameFilter) {
        slugs = slugs.filter(s => s === gameFilter);
        if (slugs.length === 0) {
            console.error(`Game "${gameFilter}" not found. Available: ${getGameSlugs().join(', ')}`);
            process.exit(1);
        }
    }

    console.log(`   Games: ${slugs.join(', ')}`);

    const stats = { total: 0, downloaded: 0, skipped: 0, failed: 0 };

    for (const slug of slugs) {
        const result = await processGame(slug);
        stats.total += result.total;
        stats.downloaded += result.downloaded;
        stats.skipped += result.skipped;
        stats.failed += result.failed;
    }

    console.log('\n📊 Summary:');
    console.log(`   Total tracks: ${stats.total}`);
    console.log(`   Downloaded:   ${stats.downloaded}`);
    console.log(`   Skipped:      ${stats.skipped}`);
    console.log(`   Failed:       ${stats.failed}`);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
