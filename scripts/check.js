const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BASE_URL = 'https://hrs0420.github.io/fukuoka-chill-map/';
const CATEGORY_FILES = {
    cafe: 'cafes.json',
    sauna: 'saunas.json',
    running: 'running.json',
};
const REQUIRED_SPOT_FIELDS = ['id', 'slug', 'name', 'area', 'rating', 'description', 'image'];
const errors = [];

function report(message) {
    errors.push(message);
}

function readJsonFile(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        report(`${path.relative(ROOT_DIR, filePath)}: JSONを読み込めません (${error.message})`);
        return null;
    }
}

function getFilesRecursively(directory, predicate) {
    if (!fs.existsSync(directory)) return [];

    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return getFilesRecursively(entryPath, predicate);
        return predicate(entryPath) ? [entryPath] : [];
    });
}

function isInsideRoot(filePath) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    return relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function checkDataFiles() {
    const parsedData = new Map();
    const dataFiles = getFilesRecursively(DATA_DIR, filePath => filePath.endsWith('.json'));

    dataFiles.forEach(filePath => {
        parsedData.set(path.basename(filePath), readJsonFile(filePath));
    });

    const spotIds = new Set();
    const slugs = new Set();
    const spotsById = new Map();

    Object.entries(CATEGORY_FILES).forEach(([category, fileName]) => {
        const spots = parsedData.get(fileName);
        if (!Array.isArray(spots)) {
            report(`data/${fileName}: スポット一覧はJSON配列にしてください`);
            return;
        }

        spots.forEach((spot, index) => {
            const location = `data/${fileName}[${index}]`;
            if (!spot || typeof spot !== 'object' || Array.isArray(spot)) {
                report(`${location}: スポットはオブジェクトにしてください`);
                return;
            }

            REQUIRED_SPOT_FIELDS.forEach(field => {
                if (spot[field] === undefined || spot[field] === null || spot[field] === '') {
                    report(`${location}: ${field} がありません`);
                }
            });

            if (typeof spot.id === 'string' && spot.id) {
                if (spotIds.has(spot.id)) report(`${location}: id「${spot.id}」が重複しています`);
                spotIds.add(spot.id);
                spotsById.set(spot.id, { spot, category });
            } else {
                report(`${location}: id は空でない文字列にしてください`);
            }
            if (typeof spot.slug === 'string' && spot.slug) {
                if (slugs.has(spot.slug)) report(`${location}: slug「${spot.slug}」が重複しています`);
                slugs.add(spot.slug);
            } else {
                report(`${location}: slug は空でない文字列にしてください`);
            }

            if (typeof spot.rating !== 'number' || !Number.isFinite(spot.rating) || spot.rating < 1 || spot.rating > 5) {
                report(`${location}: rating は1〜5の数値にしてください`);
            }

            if (typeof spot.image === 'string' && spot.image) {
                const imagePath = path.resolve(ROOT_DIR, spot.image);
                if (!isInsideRoot(imagePath) || !fs.existsSync(imagePath) || !fs.statSync(imagePath).isFile()) {
                    report(`${location}: image のファイルがありません (${spot.image})`);
                }
            }
        });
    });

    const affiliates = parsedData.get('affiliates.json');
    if (!Array.isArray(affiliates)) {
        report('data/affiliates.json: アフィリエイト一覧はJSON配列にしてください');
    } else {
        affiliates.forEach((affiliate, index) => {
            const location = `data/affiliates.json[${index}]`;
            if (affiliate.categories !== undefined && !Array.isArray(affiliate.categories)) {
                report(`${location}: categories は配列にしてください`);
            } else if (Array.isArray(affiliate.categories)) {
                affiliate.categories.forEach(category => {
                    if (!Object.hasOwn(CATEGORY_FILES, category)) {
                        report(`${location}: 存在しないカテゴリ「${category}」を参照しています`);
                    }
                });
            }
            if (affiliate.spots !== undefined && !Array.isArray(affiliate.spots)) {
                report(`${location}: spots は配列にしてください`);
            } else if (Array.isArray(affiliate.spots)) {
                affiliate.spots.forEach(spotId => {
                    if (!spotsById.has(spotId)) {
                        report(`${location}: 存在しないスポットID「${spotId}」を参照しています`);
                    }
                });
            }
        });
    }

    return { parsedData, spotsById };
}

function resolveLocalFile(pagePath, rawUrl) {
    const value = rawUrl.trim();
    if (!value || value.startsWith('#') || value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('/')) {
        return null;
    }

    const pathPart = value.split(/[?#]/, 1)[0];
    if (!pathPart) return pagePath;

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathPart);
    } catch {
        report(`${path.relative(ROOT_DIR, pagePath)}: URLをデコードできません (${value})`);
        return null;
    }

    const resolvedPath = path.resolve(path.dirname(pagePath), decodedPath);
    if (!isInsideRoot(resolvedPath)) {
        report(`${path.relative(ROOT_DIR, pagePath)}: サイト外を参照しています (${value})`);
        return null;
    }

    if (value.endsWith('/') || (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory())) {
        return path.join(resolvedPath, 'index.html');
    }
    return resolvedPath;
}

function checkHtmlLinks() {
    const htmlFiles = getFilesRecursively(ROOT_DIR, filePath => filePath.endsWith('.html'));

    htmlFiles.forEach(pagePath => {
        const html = fs.readFileSync(pagePath, 'utf8');
        const attributes = html.matchAll(/\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi);

        for (const match of attributes) {
            const targetPath = resolveLocalFile(pagePath, match[2] ?? match[3] ?? '');
            if (targetPath && (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile())) {
                report(`${path.relative(ROOT_DIR, pagePath)}: ${match[1]} のリンク先ファイルがありません (${match[2] ?? match[3]})`);
            }
        }
    });
}

function checkSitemap() {
    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) {
        report('sitemap.xml がありません');
        return;
    }

    const sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match =>
        match[1].replace(/&amp;/g, '&').trim()
    );
    if (locations.length === 0) report('sitemap.xml にURLがありません');

    locations.forEach(location => {
        let url;
        try {
            url = new URL(location, BASE_URL);
        } catch {
            report(`sitemap.xml: URLが不正です (${location})`);
            return;
        }

        const base = new URL(BASE_URL);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
            report(`sitemap.xml: サイト外のURLです (${location})`);
            return;
        }

        let relativePath;
        try {
            relativePath = decodeURIComponent(url.pathname.slice(base.pathname.length));
        } catch {
            report(`sitemap.xml: URLをデコードできません (${location})`);
            return;
        }

        const filePath = path.resolve(ROOT_DIR, relativePath || 'index.html');
        if (!isInsideRoot(filePath) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            report(`sitemap.xml: URLのファイルがありません (${location})`);
        }
    });
}

checkDataFiles();
checkHtmlLinks();
checkSitemap();

if (errors.length > 0) {
    console.error(`品質チェックで${errors.length}件の問題が見つかりました:`);
    errors.forEach(error => console.error(`- ${error}`));
    process.exitCode = 1;
} else {
    console.log('品質チェックに成功しました。');
}
