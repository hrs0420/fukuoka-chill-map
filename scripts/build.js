const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://hrs0420.github.io/fukuoka-chill-map/';

// FIELD_CONFIG matching js/categories.js
const FIELD_CONFIG = {
    cafe: [
        { key: 'wifi', label: 'Wi-Fi', icon: 'wifi', type: 'bool' },
        { key: 'outlet', label: '電源', icon: 'plug-zap', type: 'bool' },
        { key: 'parking', label: '駐車場', icon: 'square-parking', type: 'bool' },
        { key: 'hours', label: '営業時間', icon: 'clock', type: 'text' },
        { key: 'closed', label: '定休日', icon: 'calendar-off', type: 'text' },
        { key: 'payment', label: '決済方法', icon: 'credit-card', type: 'text' },
    ],
    sauna: [
        { key: 'onsen', label: '温泉', icon: 'droplets', type: 'bool' },
        { key: 'loyly', label: 'ロウリュ', icon: 'flame', type: 'bool' },
        { key: 'stay', label: '宿泊', icon: 'bed', type: 'bool', trueText: '可能', falseText: '不可' },
        { key: 'parking', label: '駐車場', icon: 'square-parking', type: 'bool' },
        { key: 'hours', label: '営業時間', icon: 'clock', type: 'text' },
    ],
    running: [
        { key: 'distance', label: '1周', icon: 'route', type: 'text' },
        { key: 'surface', label: '路面', icon: 'layers', type: 'text' },
        { key: 'lighted', label: 'ナイター(夜間照明)', icon: 'lightbulb', type: 'bool' },
        { key: 'locker', label: 'ロッカー', icon: 'backpack', type: 'bool' },
        { key: 'bathroom', label: 'トイレ', icon: 'toilet', type: 'bool' },
    ],
};

const CATEGORY_FILES = {
    cafe: 'cafes.json',
    sauna: 'saunas.json',
    running: 'running.json',
};

const SCHEMA_TYPE = {
    cafe: 'CafeOrCoffeeShop',
    sauna: 'HealthClub',
    running: 'TouristAttraction',
};

function escapeHTML(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
    return escapeHTML(value);
}

function generateSpotHTML(spot, category) {
    const spotNameEsc = escapeHTML(spot.name);
    const spotAreaEsc = escapeHTML(spot.area || '情報なし');
    const spotRatingEsc = escapeHTML(spot.rating !== undefined ? spot.rating : '0.0');
    const spotDescriptionEsc = escapeHTML(spot.description || '');
    const spotAddressEsc = escapeHTML(spot.address || '');

    const shortDesc = (spot.description || '').slice(0, 110);
    const shortDescEsc = escapeHTML(shortDesc);

    const pageUrl = `${BASE_URL}spots/${category}/${spot.slug}.html`;
    const imageUrl = spot.image ? `${BASE_URL}${spot.image}` : '';
    const encodedImageUrl = spot.image ? encodeURI(imageUrl) : '';

    // Field items HTML
    const fields = FIELD_CONFIG[category] || [];
    let fieldsHTML = '';
    fields.forEach(field => {
        if (spot[field.key] === undefined || spot[field.key] === null || spot[field.key] === '') return;
        let valueText;
        if (field.type === 'bool') {
            valueText = spot[field.key]
                ? (field.trueText || 'あり')
                : (field.falseText || 'なし');
        } else {
            valueText = spot[field.key];
        }
        fieldsHTML += `        <p class="detail-field"><i data-lucide="${field.icon}"></i> <span>${field.label}: ${escapeHTML(valueText)}</span></p>\n`;
    });

    // Address style & display
    const addressDisplayStyle = spot.address ? 'display: flex;' : 'display: none;';

    // Google map links
    const searchTarget = spot.address || spot.name;
    const encodedQuery = encodeURIComponent(searchTarget);
    const mapEmbedSrc = `https://maps.google.co.jp/maps?q=${encodedQuery}&amp;output=embed&amp;z=15`;
    const mapButtonHref = spot.map || `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

    // Saunashow ikitai link
    const ikitaiStyle = (category === 'sauna' && spot.ikitai) ? 'display: inline-block; background-color: #e67e22;' : 'display: none; background-color: #e67e22;';
    const ikitaiHref = spot.ikitai || '#';

    // JSON-LD
    const jsonLdObj = {
        '@context': 'https://schema.org',
        '@type': SCHEMA_TYPE[category],
        'name': spot.name,
        'description': spot.description || '',
        'image': spot.image ? `${BASE_URL}${spot.image}` : '',
        'url': pageUrl,
    };
    if (spot.address) {
        jsonLdObj.address = {
            '@type': 'PostalAddress',
            'streetAddress': spot.address,
        };
    }
    if (spot.rating) {
        jsonLdObj.review = {
            '@type': 'Review',
            'author': { '@type': 'Organization', 'name': 'Fukuoka Chill Map' },
            'reviewRating': {
                '@type': 'Rating',
                'ratingValue': Number(spot.rating),
                'bestRating': 5,
                'worstRating': 1,
            },
        };
    }
    const jsonLdString = JSON.stringify(jsonLdObj, null, 2);

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spotNameEsc}（${spotAreaEsc}） | Fukuoka Chill Map</title>
    <meta name="description" content="${shortDescEsc}">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${spotNameEsc}">
    <meta property="og:description" content="${shortDescEsc}">
    <meta property="og:image" content="${escapeAttribute(encodedImageUrl)}">
    <meta property="og:url" content="${pageUrl}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="icon" href="../../images/Fukuoka-monuments.jpg" type="image/jpeg">
    <script type="application/ld+json">
${jsonLdString}
    </script>
</head>

<body data-spot-name="${escapeAttribute(spot.name)}" data-spot-type="${category}">

<header>
    <div class="header-container">
        <a href="../../index.html" class="header-logo-link">
            <img src="../../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img">
        </a>

        <div class="header-title-group">
            <h1 id="title">${spotNameEsc}</h1>
        </div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く">
            <span></span>
            <span></span>
            <span></span>
        </button>
    </div>

    <nav class="nav-menu" id="nav-menu">
        <a href="../../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../../list.html?category=cafe" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../../list.html?category=sauna" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../../list.html?category=running" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<div class="detail">
    <h2 id="spot-name">${spotNameEsc}</h2>

    <p id="area" class="detail-meta"><i data-lucide="map-pin"></i> <span>エリア: ${spotAreaEsc}</span></p>
    <p id="rating" class="detail-meta"><i data-lucide="star"></i> <span>評価: ${spotRatingEsc}</span></p>

    <div id="detail-fields">
${fieldsHTML}    </div>

    <p id="address" class="detail-meta" style="${addressDisplayStyle}"><i data-lucide="home"></i> <span>住所: ${spotAddressEsc}</span></p>

    <div class="map-wrapping">
        <iframe
            id="google-map"
            src="${mapEmbedSrc}"
            class="google-map"
            width="100%"
            height="300"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
        </iframe>
    </div>

    <a id="mapLink" href="${escapeAttribute(mapButtonHref)}" target="_blank" class="map-button">
        Googleマップで大きく見る
    </a>

    <div style="margin-top: 15px;">
        <a id="ikitaiLink" href="${escapeAttribute(ikitaiHref)}" target="_blank" class="map-button" style="${ikitaiStyle}">
            サウナイキタイで見る
        </a>
    </div>

    <hr>

    <p id="description">${spotDescriptionEsc}</p>
</div>

<div class="detail-section">
    <h3><i data-lucide="message-circle"></i> 口コミ・評価</h3>

    <div class="rating-summary">
        <span class="big-rating" id="average-rating">⭐ 0.0</span>
        <span class="count-text" id="review-count">(0件の口コミ)</span>
    </div>

    <form id="comment-form" class="comment-form">
        <h4>口コミを投稿する</h4>

        <div class="form-group">
            <label for="reviewer-name">お名前:</label>
            <input type="text" id="reviewer-name" placeholder="匿名" required>
        </div>
        <div class="form-group">
            <label for="review-score">評価:</label>
            <select id="review-score" required>
                <option value="5">⭐⭐⭐⭐⭐(5 - 最高)</option>
                <option value="4">⭐⭐⭐⭐(4 - 良い)</option>
                <option value="3" selected>⭐⭐⭐(3 - 普通)</option>
                <option value="2">⭐⭐(2 - 微妙)</option>
                <option value="1">⭐(1 - 悪い)</option>
            </select>
        </div>

        <div class="form-group">
            <label for="review-comment">コメント</label>
            <textarea id="review-comment" rows="3" placeholder="お店の雰囲気や感想を書こう！" required></textarea>
        </div>

        <button type="submit" class="submit-btn">投稿する</button>
    </form>

    <div id="comments-list" class="comments-list"></div>
</div>

<div id="custom-modal" class="modal-overlay">
    <div class="modal-content">
        <div class="modal-icon"><i data-lucide="party-popper"></i></div>
        <h3>投稿が完了しました！</h3>
        <p>貴重な口コミ・評価をありがとうございます。</p>
        <button type="button" class="modal-btn" onclick="document.getElementById('custom-modal').classList.remove('active');">閉じる</button>
    </div>
</div>

<p style="text-align: center; margin: 30px 0;">
    <a href="../../index.html">←ホームへ戻る</a>
</p>

<footer>
    <p id="copyright">© 2026 Fukuoka Chill Map</p>
    <img src="../../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../../js/utils.js"></script>
<script src="../../js/categories.js"></script>
<script src="../../js/detail.js"></script>

</body>

</html>
`;
}

function build() {
    const rootDir = path.resolve(__dirname, '..');
    const spotsDir = path.join(rootDir, 'spots');

    const sitemapUrls = [
        { loc: `${BASE_URL}index.html`, priority: '1.0' },
        { loc: `${BASE_URL}list.html?category=cafe`, priority: '0.8' },
        { loc: `${BASE_URL}list.html?category=sauna`, priority: '0.8' },
        { loc: `${BASE_URL}list.html?category=running`, priority: '0.8' },
    ];

    let spotCount = 0;

    Object.entries(CATEGORY_FILES).forEach(([category, fileName]) => {
        const jsonPath = path.join(rootDir, 'data', fileName);
        const spots = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        const categoryDir = path.join(spotsDir, category);
        fs.mkdirSync(categoryDir, { recursive: true });

        spots.forEach(spot => {
            if (!spot.slug) {
                throw new Error(`Spot missing slug: ${spot.id} - ${spot.name}`);
            }
            const htmlContent = generateSpotHTML(spot, category);
            const htmlPath = path.join(categoryDir, `${spot.slug}.html`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');

            sitemapUrls.push({
                loc: `${BASE_URL}spots/${category}/${spot.slug}.html`,
                priority: '0.6',
            });
            spotCount++;
        });
    });

    // Generate sitemap.xml
    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

    fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapXML, 'utf8');

    console.log(`Successfully generated ${spotCount} spot HTML files and sitemap.xml.`);
}

build();
