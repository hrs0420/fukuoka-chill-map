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

const CATEGORY_PAGE_TITLES = {
    cafe: 'カフェ一覧',
    sauna: 'サウナ一覧',
    running: 'ランニングスポット一覧',
};

const CATEGORY_ICONS = {
    cafe: 'coffee',
    sauna: 'flame',
    running: 'footprints',
};

const SCHEMA_TYPE = {
    cafe: 'CafeOrCoffeeShop',
    sauna: 'HealthClub',
    running: 'TouristAttraction',
};

const AFFILIATE_STATUS_LABELS = {
    using: '愛用中',
    used: '使ったことがある',
    interested: '気になっている',
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

function resolveSpotImage(rootDir, spot) {
    for (const extension of ['.jpg', '.jpeg', '.png', '.webp']) {
        const candidate = path.join(rootDir, 'images', 'spots', `${spot.slug}${extension}`);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return `images/spots/${spot.slug}${extension}`;
    }
    return spot.image || '';
}

function writeStatusReport(rootDir, allSpots, articles) {
    const checks = [
        ['body', '紹介文', spot => Boolean(spot.body && String(spot.body).trim())],
        ['visited', '訪問時期', spot => Boolean(spot.visited)],
        ['photo', '写真', spot => Boolean(spot.slug && ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fs.existsSync(path.join(rootDir, 'images', 'spots', `${spot.slug}${ext}`))))],
        ['address', '住所', spot => Boolean(spot.address)],
        ['map', '地図', spot => Boolean(spot.map)],
    ];
    const totals = Object.fromEntries(checks.map(([key]) => [key, allSpots.filter(({ spot }) => checks.find(item => item[0] === key)[2](spot)).length]));
    const publicCount = articles.filter(article => !article.draft).length;
    const draftCount = articles.filter(article => article.draft).length;
    const today = new Date();
    const currentMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();
    const confirmationDate = spot => {
        const checked = typeof spot.checked === 'string' && /^\d{4}-\d{2}$/.test(spot.checked) ? spot.checked : '';
        if (!checked) return { text: spot.visited || '—', stale: false };
        const [year, month] = checked.split('-').map(Number);
        return { text: checked, stale: currentMonth - (year * 12 + month - 1) >= 6 };
    };
    const lines = [
        '# 運営状況レポート',
        '',
        `- 紹介文 ${totals.body}/${allSpots.length} / 訪問時期 ${totals.visited}/${allSpots.length} / 写真 ${totals.photo}/${allSpots.length} / 住所 ${totals.address}/${allSpots.length} / Googleマップ ${totals.map}/${allSpots.length}`,
        `- 記事: 公開 ${publicCount} 件 / 下書き ${draftCount} 件`,
        '',
    ];
    for (const [category, fileName] of Object.entries(CATEGORY_FILES)) {
        lines.push(`## ${CATEGORY_PAGE_TITLES[category]}`, '');
        const entries = allSpots.filter(entry => entry.category === category);
        entries.forEach(({ spot }) => {
            const complete = checks.every(([, , predicate]) => predicate(spot));
            const result = checks.map(([, label, predicate]) => `${label} ${predicate(spot) ? '✓' : '✗'}`).join(' / ');
            const date = confirmationDate(spot);
            lines.push(`- [${complete ? 'x' : ' '}] ${spot.name}（${spot.area}） 確認日 ${date.text}${date.stale ? ' ⚠' : ''} / ${result}`);
        });
        lines.push('');
    }
    fs.writeFileSync(path.join(rootDir, 'docs', 'status.md'), `${lines.join('\n')}\n`, 'utf8');
}

function generateAffiliateHTML(spot, category, affiliates) {
    const products = affiliates.filter(product =>
        (Array.isArray(product.categories) && product.categories.includes(category)) ||
        (Array.isArray(product.spots) && product.spots.includes(spot.id))
    );
    if (products.length === 0) return '';

    const cardsHTML = products.map(product => {
        const statusLabel = AFFILIATE_STATUS_LABELS[product.status] || '';
        const impressionHTML = product.impression
            ? `<img src="${escapeAttribute(product.impression)}" width="1" height="1" alt="">`
            : '';

        return `        <article class="affiliate-card">
            <p class="affiliate-status">${escapeHTML(statusLabel)}</p>
            <h4>${escapeHTML(product.name)}</h4>
            <p>${escapeHTML(product.comment)}</p>
            <a class="affiliate-link" href="${escapeAttribute(product.url)}" rel="sponsored nofollow noopener" target="_blank" referrerpolicy="no-referrer-when-downgrade">${escapeHTML(product.shop)}で見る</a>
            ${impressionHTML}
        </article>`;
    }).join('\n');

    return `<section class="affiliate-section">
    <h3>おすすめアイテム <span class="affiliate-pr">PR</span></h3>
    <div class="affiliate-cards">
${cardsHTML}
    </div>
</section>`;
}

function getRelatedSpots(spot, category, allSpots) {
    const candidates = allSpots.filter(item => item.spot.id !== spot.id);
    const sameArea = candidates
        .filter(item => item.spot.area === spot.area)
        .sort((a, b) => Number(b.spot.rating) - Number(a.spot.rating));
    const selected = sameArea.slice(0, 3);

    if (selected.length < 3) {
        const sameCategory = candidates
            .filter(item => item.category === category && !selected.some(selectedItem => selectedItem.spot.id === item.spot.id))
            .sort((a, b) => Number(b.spot.rating) - Number(a.spot.rating));
        selected.push(...sameCategory.slice(0, 3 - selected.length));
    }

    return selected;
}

function generateRelatedSpotsHTML(spot, category, allSpots) {
    const relatedSpots = getRelatedSpots(spot, category, allSpots);
    const cardsHTML = relatedSpots.map(({ spot: relatedSpot, category: relatedCategory }) => {
        const detailUrl = `../../spots/${relatedCategory}/${encodeURIComponent(relatedSpot.slug)}.html`;
        const imagePath = relatedSpot.image ? `../../${relatedSpot.image}` : '';
        const categoryLabel = relatedCategory !== category
            ? `<small class="related-spot-category">${escapeHTML(CATEGORY_PAGE_TITLES[relatedCategory].replace(/一覧$/, ''))}</small>\n                    `
            : '';

        return `        <a href="${escapeAttribute(detailUrl)}" class="card-link related-spot-link">
            <article class="card">
                <div class="card-media">
                    <img src="${escapeAttribute(imagePath)}" alt="${escapeAttribute(relatedSpot.name)}" loading="lazy">
                    <span class="rating-badge">⭐ ${escapeHTML(relatedSpot.rating !== undefined ? relatedSpot.rating : '0.0')}</span>
                </div>
                <div class="card-body">
                    ${categoryLabel}<h4>${escapeHTML(relatedSpot.name)}</h4>
                    <p class="card-area">📍 ${escapeHTML(relatedSpot.area || '情報なし')}</p>
                </div>
            </article>
        </a>`;
    }).join('\n');

    return `<section class="related-spots-section" aria-labelledby="related-spots-title">
    <h3 id="related-spots-title">近くのスポット</h3>
    <div class="related-spots-list">
${cardsHTML}
    </div>
</section>`;
}

function generateCategoryCardHTML(spot, category) {
    const tags = category === 'running'
        ? [
            `🏃 1周: ${spot.distance || ''}`,
            `🛣 ${spot.surface || ''}`,
            spot.lighted ? '💡 ナイター' : '',
            spot.locker ? '🎒 ロッカー' : '',
            spot.bathroom ? '🚽 トイレ' : '',
        ].filter(Boolean)
        : [];
    const tagsHTML = tags.length > 0
        ? `<div class="card-tag-row">${tags.map(tag => `<span class="card-tag">${escapeHTML(tag)}</span>`).join('')}</div>\n                    `
        : '';

    return `        <a href="../${category}/${escapeAttribute(encodeURIComponent(spot.slug))}.html" class="card-link">
            <article class="card">
                <div class="card-media">
                    <img src="../../${escapeAttribute(spot.image)}" alt="${escapeAttribute(spot.name)}" class="cafe-image" loading="lazy">
                    <span class="rating-badge">⭐ ${escapeHTML(spot.rating)}</span>
                    <span class="favorite" data-name="${escapeAttribute(spot.name)}">🩶</span>
                </div>
                <div class="card-body">
                    <h2>${escapeHTML(spot.name)}</h2>
                    <p class="card-area">📍 ${escapeHTML(spot.area)}</p>
                    ${tagsHTML}<p class="card-desc">${escapeHTML(spot.description)}</p>
                </div>
            </article>
        </a>`;
}

function generateCategoryPageHTML(category, spots) {
    const title = CATEGORY_PAGE_TITLES[category];
    const pageUrl = `${BASE_URL}spots/${category}/index.html`;
    const description = `福岡の${title}。エリアや条件で絞り込んで検索できます。`;
    const sortedSpots = [...spots].sort((a, b) => Number(b.rating) - Number(a.rating));
    const cardsHTML = sortedSpots.map(spot => generateCategoryCardHTML(spot, category)).join('\n');
    const breadcrumbJsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'トップ', item: `${BASE_URL}index.html` },
            { '@type': 'ListItem', position: 2, name: title, item: pageUrl },
        ],
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
    <title>${escapeHTML(title)} | Fukuoka Chill Map</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeAttribute(`${title} | Fukuoka Chill Map`)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="Fukuoka Chill Map">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:image" content="${BASE_URL}images/Fukuoka-monuments.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="icon" href="../../images/Fukuoka-monuments.jpg" type="image/jpeg">
    <script type="application/ld+json">
${breadcrumbJsonLd}
    </script>
</head>

<body data-category="${category}">

<header>
    <div class="header-container">
        <a href="../../index.html" class="header-logo-link">
            <img src="../../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img">
        </a>
        <div class="header-title-group">
            <h1 id="page-title-icon-wrap"><i id="page-title-icon" data-lucide="${CATEGORY_ICONS[category]}"></i> <span id="page-title">${escapeHTML(title)}</span></h1>
        </div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く">
            <span></span>
            <span></span>
            <span></span>
        </button>
    </div>
    <nav class="nav-menu" id="nav-menu">
        <a href="../../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../../articles/index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="../../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<nav class="breadcrumb-list" aria-label="パンくずリスト">
    <a href="../../index.html">トップ</a>
    <span aria-hidden="true">&gt;</span>
    <span aria-current="page">${escapeHTML(title)}</span>
</nav>

<div class="search-container" id="search-container"></div>
<div class="filter-container" id="filter-container"></div>
<main class="card-grid" id="list-grid">
${cardsHTML}
</main>

<footer>
    <p>© 2026 Fukuoka Chill Map</p>
    <p class="footer-links"><a href="../../about.html">運営者情報</a> / <a href="../../privacy.html">プライバシーポリシー</a> / <a href="../../contact.html">お問い合わせ</a></p>
    <img src="../../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../../js/utils.js"></script>
<script src="../../js/categories.js"></script>
<script src="../../js/list.js"></script>

</body>

</html>
`;
}

function generateArticleParagraphs(text) {
    if (!text) return '';
    return String(text).split('\n\n').map(paragraph => `        <p>${escapeHTML(paragraph)}</p>`).join('\n');
}

function generateArticleSpotCard(spotEntry) {
    if (!spotEntry) return '';
    const { spot, category } = spotEntry;
    return `<article class="card article-spot-card">
        <a href="../spots/${category}/${escapeAttribute(encodeURIComponent(spot.slug))}.html" class="card-link">
            <div class="card-media">
                <img src="../${escapeAttribute(spot.image)}" alt="${escapeAttribute(spot.name)}" loading="lazy">
                <span class="rating-badge">⭐ ${escapeHTML(spot.rating)}</span>
            </div>
            <div class="card-body">
                <h3>${escapeHTML(spot.name)}</h3>
                <p class="card-area">📍 ${escapeHTML(spot.area)}</p>
            </div>
        </a>
    </article>`;
}

function generateArticleHTML(article, spotsById) {
    const pageUrl = `${BASE_URL}articles/${article.slug}.html`;
    const updated = article.updated || article.published;
    const updatedHTML = article.updated
        ? `\n    <p>更新日: <time datetime="${escapeAttribute(article.updated)}">${escapeHTML(article.updated)}</time></p>`
        : '';
    const sectionsHTML = (article.sections || []).map(section => {
        if (section.spot_id && !spotsById.has(section.spot_id)) {
            throw new Error(`Article references an unknown spot ID: ${article.slug} - ${section.spot_id}`);
        }
        const spotCard = section.spot_id ? generateArticleSpotCard(spotsById.get(section.spot_id)) : '';
        const sectionContent = [
            generateArticleParagraphs(section.body),
            spotCard ? `        ${spotCard}` : '',
        ].filter(Boolean).join('\n');
        return `    <section class="article-section">
        <h2>${escapeHTML(section.heading)}</h2>
${sectionContent}
    </section>`;
    }).join('\n');
    const articleJsonLdData = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.published,
        mainEntityOfPage: pageUrl,
        author: { '@type': 'Organization', name: 'Fukuoka Chill Map' },
        publisher: { '@type': 'Organization', name: 'Fukuoka Chill Map' },
    };
    if (article.updated) articleJsonLdData.dateModified = article.updated;
    const articleJsonLd = JSON.stringify(articleJsonLdData, null, 2).replace(/</g, '\\u003c');
    const breadcrumbJsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'トップ', item: `${BASE_URL}index.html` },
            { '@type': 'ListItem', position: 2, name: '記事一覧', item: `${BASE_URL}articles/index.html` },
            { '@type': 'ListItem', position: 3, name: article.title, item: pageUrl },
        ],
    }, null, 2).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
    <title>${escapeHTML(article.title)} | Fukuoka Chill Map</title>
    <meta name="description" content="${escapeAttribute(article.description)}">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeAttribute(article.title)}">
    <meta property="og:description" content="${escapeAttribute(article.description)}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="Fukuoka Chill Map">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:image" content="${BASE_URL}images/Fukuoka-monuments.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="icon" href="../images/Fukuoka-monuments.jpg" type="image/jpeg">
    <script type="application/ld+json">
${articleJsonLd}
    </script>
    <script type="application/ld+json">
${breadcrumbJsonLd}
    </script>
</head>

<body>

<header>
    <div class="header-container">
        <a href="../index.html" class="header-logo-link">
            <img src="../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img">
        </a>
        <div class="header-title-group"><h1>${escapeHTML(article.title)}</h1></div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く"><span></span><span></span><span></span></button>
    </div>
    <nav class="nav-menu" id="nav-menu">
        <a href="../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<nav class="breadcrumb-list" aria-label="パンくずリスト">
    <a href="../index.html">トップ</a>
    <span aria-hidden="true">&gt;</span>
    <a href="index.html">記事一覧</a>
    <span aria-hidden="true">&gt;</span>
    <span aria-current="page">${escapeHTML(article.title)}</span>
</nav>

<main class="article-content">
    <h1>${escapeHTML(article.title)}</h1>
    <div class="article-meta">
        <p>公開日: <time datetime="${escapeAttribute(article.published)}">${escapeHTML(article.published)}</time></p>${updatedHTML}
    </div>
${generateArticleParagraphs(article.intro)}
${sectionsHTML}
${article.outro ? `    <div class="article-outro">${generateArticleParagraphs(article.outro)}</div>` : ''}
</main>

<footer>
    <p>© 2026 Fukuoka Chill Map</p>
    <p class="footer-links"><a href="../about.html">運営者情報</a> / <a href="../privacy.html">プライバシーポリシー</a> / <a href="../contact.html">お問い合わせ</a></p>
    <img src="../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../js/utils.js"></script>

</body>

</html>
`;
}

function generateArticlesIndexHTML(articles) {
    const visibleArticles = articles.filter(article => !article.draft)
        .sort((a, b) => b.published.localeCompare(a.published));
    const articleCards = visibleArticles.length > 0
        ? visibleArticles.map(article => `        <article class="article-list-card">
            <p class="article-meta">公開日: <time datetime="${escapeAttribute(article.published)}">${escapeHTML(article.published)}</time></p>
            <h2><a href="${escapeAttribute(encodeURIComponent(article.slug))}.html">${escapeHTML(article.title)}</a></h2>
            <p>${escapeHTML(article.description)}</p>
        </article>`).join('\n')
        : '        <p class="articles-empty">公開中の記事はありません。</p>';

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
    <title>記事一覧 | Fukuoka Chill Map</title>
    <meta name="description" content="福岡のカフェ・サウナ・ランニングスポットを紹介する記事一覧です。">
    <link rel="canonical" href="${BASE_URL}articles/index.html">
    <meta property="og:type" content="website">
    <meta property="og:title" content="記事一覧 | Fukuoka Chill Map">
    <meta property="og:description" content="福岡のスポットを紹介する記事一覧です。">
    <meta property="og:url" content="${BASE_URL}articles/index.html">
    <meta property="og:site_name" content="Fukuoka Chill Map">
    <meta property="og:image" content="${BASE_URL}images/Fukuoka-monuments.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="icon" href="../images/Fukuoka-monuments.jpg" type="image/jpeg">
</head>

<body>

<header>
    <div class="header-container">
        <a href="../index.html" class="header-logo-link">
            <img src="../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img">
        </a>
        <div class="header-title-group"><h1>記事一覧</h1></div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く"><span></span><span></span><span></span></button>
    </div>
    <nav class="nav-menu" id="nav-menu">
        <a href="../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<nav class="breadcrumb-list" aria-label="パンくずリスト">
    <a href="../index.html">トップ</a>
    <span aria-hidden="true">&gt;</span>
    <span aria-current="page">記事一覧</span>
</nav>

<main class="articles-list">
    <h2>記事一覧</h2>
${articleCards}
</main>

<footer>
    <p>© 2026 Fukuoka Chill Map</p>
    <p class="footer-links"><a href="../about.html">運営者情報</a> / <a href="../privacy.html">プライバシーポリシー</a> / <a href="../contact.html">お問い合わせ</a></p>
    <img src="../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../js/utils.js"></script>

</body>

</html>
`;
}

function generateAreaSpotCard({ spot, category }) {
    const categoryLabel = CATEGORY_PAGE_TITLES[category].replace(/一覧$/, '');
    return `        <a href="../spots/${category}/${escapeAttribute(encodeURIComponent(spot.slug))}.html" class="card-link area-spot-link">
            <article class="card">
                <div class="card-media">
                    <img src="../${escapeAttribute(spot.image)}" alt="${escapeAttribute(spot.name)}" class="cafe-image" loading="lazy">
                    <span class="rating-badge">⭐ ${escapeHTML(spot.rating)}</span>
                </div>
                <div class="card-body">
                    <small class="area-card-category">${escapeHTML(categoryLabel)}</small>
                    <h2>${escapeHTML(spot.name)}</h2>
                    <p class="card-area">📍 ${escapeHTML(spot.area)}</p>
                    <p class="card-desc">${escapeHTML(spot.description)}</p>
                </div>
            </article>
        </a>`;
}

function generateAreaPageHTML(area, areaSpots) {
    const pageUrl = `${BASE_URL}areas/${area.slug}.html`;
    const title = `${area.name}のスポット一覧`;
    const description = `福岡の${escapeHTML(area.name)}エリアにあるカフェ・サウナ・ランニングスポットを紹介します。`;
    const cardsHTML = areaSpots
        .sort((a, b) => Number(b.spot.rating) - Number(a.spot.rating))
        .map(generateAreaSpotCard)
        .join('\n');
    const breadcrumbJsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'トップ', item: `${BASE_URL}index.html` },
            { '@type': 'ListItem', position: 2, name: 'エリア一覧', item: `${BASE_URL}areas/index.html` },
            { '@type': 'ListItem', position: 3, name: area.name, item: pageUrl },
        ],
    }, null, 2).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
    <title>${escapeHTML(title)} | Fukuoka Chill Map</title>
    <meta name="description" content="${escapeAttribute(description)}">
    <link rel="canonical" href="${pageUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeAttribute(`${title} | Fukuoka Chill Map`)}">
    <meta property="og:description" content="${escapeAttribute(description)}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="Fukuoka Chill Map">
    <meta property="og:image" content="${BASE_URL}images/Fukuoka-monuments.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="icon" href="../images/Fukuoka-monuments.jpg" type="image/jpeg">
    <script type="application/ld+json">
${breadcrumbJsonLd}
    </script>
</head>

<body>

<header>
    <div class="header-container">
        <a href="../index.html" class="header-logo-link"><img src="../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img"></a>
        <div class="header-title-group"><h1>${escapeHTML(title)}</h1></div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く"><span></span><span></span><span></span></button>
    </div>
    <nav class="nav-menu" id="nav-menu">
        <a href="../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../articles/index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<nav class="breadcrumb-list" aria-label="パンくずリスト">
    <a href="../index.html">トップ</a>
    <span aria-hidden="true">&gt;</span>
    <a href="index.html">エリア一覧</a>
    <span aria-hidden="true">&gt;</span>
    <span aria-current="page">${escapeHTML(area.name)}</span>
</nav>

<main class="card-grid area-spots-list">
${cardsHTML}
</main>

<footer>
    <p>© 2026 Fukuoka Chill Map</p>
    <p class="footer-links"><a href="../about.html">運営者情報</a> / <a href="../privacy.html">プライバシーポリシー</a> / <a href="../contact.html">お問い合わせ</a></p>
    <img src="../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../js/utils.js"></script>

</body>

</html>
`;
}

function generateAreasIndexHTML(areas, spotsByArea) {
    const areaItems = areas.map(area => {
        const count = spotsByArea.get(area.name)?.length || 0;
        return `        <li class="area-list-item">
            <a href="${escapeAttribute(encodeURIComponent(area.slug))}.html">${escapeHTML(area.name)}</a>
            <span>${count}件</span>
        </li>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
    <title>エリア一覧 | Fukuoka Chill Map</title>
    <meta name="description" content="福岡のエリアからカフェ・サウナ・ランニングスポットを探せます。">
    <link rel="canonical" href="${BASE_URL}areas/index.html">
    <meta property="og:type" content="website">
    <meta property="og:title" content="エリア一覧 | Fukuoka Chill Map">
    <meta property="og:description" content="福岡のエリアからスポットを探せます。">
    <meta property="og:url" content="${BASE_URL}areas/index.html">
    <meta property="og:site_name" content="Fukuoka Chill Map">
    <meta property="og:image" content="${BASE_URL}images/Fukuoka-monuments.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;600&amp;family=Zen+Kaku+Gothic+New:wght@400;500;700&amp;display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="icon" href="../images/Fukuoka-monuments.jpg" type="image/jpeg">
</head>

<body>

<header>
    <div class="header-container">
        <a href="../index.html" class="header-logo-link"><img src="../images/Fukuoka-monuments.jpg" alt="福岡ランドマーク" class="header-monument-img"></a>
        <div class="header-title-group"><h1>エリア一覧</h1></div>
        <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く"><span></span><span></span><span></span></button>
    </div>
    <nav class="nav-menu" id="nav-menu">
        <a href="../index.html" class="nav-link"><i data-lucide="home"></i> トップに戻る</a>
        <a href="../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../articles/index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<nav class="breadcrumb-list" aria-label="パンくずリスト">
    <a href="../index.html">トップ</a>
    <span aria-hidden="true">&gt;</span>
    <span aria-current="page">エリア一覧</span>
</nav>

<main class="areas-list">
    <h2>エリア一覧</h2>
    <ul>
${areaItems}
    </ul>
</main>

<footer>
    <p>© 2026 Fukuoka Chill Map</p>
    <p class="footer-links"><a href="../about.html">運営者情報</a> / <a href="../privacy.html">プライバシーポリシー</a> / <a href="../contact.html">お問い合わせ</a></p>
    <img src="../images/fukuoka-monuments-black.jpg" alt="福岡ランドマーク" class="footer-monument-img">
</footer>

<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script src="../js/utils.js"></script>

</body>

</html>
`;
}

function generateSpotHTML(spot, category, affiliates, allSpots, areasByName) {
    const spotNameEsc = escapeHTML(spot.name);
    const spotAreaEsc = escapeHTML(spot.area || '情報なし');
    const spotRatingEsc = escapeHTML(spot.rating !== undefined ? spot.rating : '0.0');
    const area = areasByName.get(spot.area);
    if (!area) throw new Error(`Spot area is not registered: ${spot.id} - ${spot.area}`);
    const areaLinkHTML = `<a href="../../areas/${escapeAttribute(area.slug)}.html">${spotAreaEsc}</a>`;
    const spotDescriptionEsc = escapeHTML(spot.description || '');
    const spotAddressEsc = escapeHTML(spot.address || '');
    const bodyParagraphsHTML = spot.body
        ? String(spot.body).split('\n\n').map(paragraph => `<p>${escapeHTML(paragraph)}</p>`).join('\n        ')
        : `<p>${spotDescriptionEsc}</p>`;
    const visitedHTML = spot.visited
        ? `    <p class="visited-date">訪問時期: ${escapeHTML(spot.visited)}</p>\n`
        : '';
    const checkedLabel = typeof spot.checked === 'string' && /^\d{4}-\d{2}$/.test(spot.checked)
        ? `${spot.checked.slice(0, 4)}年${Number(spot.checked.slice(5, 7))}月`
        : (spot.visited || '');
    const checkedHTML = checkedLabel
        ? `<p class="checked-date">情報確認日: ${escapeHTML(checkedLabel)}</p>`
        : '';

    const shortDesc = (spot.description || '').slice(0, 110);
    const shortDescEsc = escapeHTML(shortDesc);

    const pageUrl = `${BASE_URL}spots/${category}/${spot.slug}.html`;
    const imageUrl = spot.image ? `${BASE_URL}${spot.image}` : '';
    const encodedImageUrl = spot.image ? encodeURI(imageUrl) : '';
    const affiliateHTML = generateAffiliateHTML(spot, category, affiliates);
    const relatedSpotsHTML = generateRelatedSpotsHTML(spot, category, allSpots);
    const categoryTitle = CATEGORY_PAGE_TITLES[category];
    const categoryUrl = `${BASE_URL}spots/${category}/index.html`;

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
    const breadcrumbJsonLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'トップ',
                item: `${BASE_URL}index.html`,
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: categoryTitle,
                item: categoryUrl,
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: spot.name,
                item: pageUrl,
            },
        ],
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MQNEWCRC3V"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-MQNEWCRC3V');
    </script>
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
    <script type="application/ld+json">
${breadcrumbJsonLd}
    </script>
</head>

<body data-spot-name="${escapeAttribute(spot.name)}" data-spot-type="${category}" data-area-slug="${escapeAttribute(area.slug)}">

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
        <a href="../../spots/cafe/index.html" class="nav-link"><i data-lucide="coffee"></i> カフェ</a>
        <a href="../../spots/sauna/index.html" class="nav-link"><i data-lucide="flame"></i> サウナ</a>
        <a href="../../spots/running/index.html" class="nav-link"><i data-lucide="footprints"></i> ランニング</a>
        <a href="../../articles/index.html" class="nav-link"><i data-lucide="book-open"></i> 記事</a>
        <a href="../../areas/index.html" class="nav-link"><i data-lucide="map-pin"></i> エリア</a>
        <a href="../../favorites.html" class="nav-link"><i data-lucide="heart"></i> お気に入り</a>
        <a href="../../request.html" class="nav-link"><i data-lucide="clipboard-list"></i> スポット追加依頼</a>
    </nav>
</header>

<div class="detail">
    <nav class="breadcrumb-list" aria-label="パンくずリスト">
        <a href="../../index.html">トップ</a>
        <span aria-hidden="true">&gt;</span>
        <a href="../../spots/${category}/index.html">${escapeHTML(categoryTitle)}</a>
        <span aria-hidden="true">&gt;</span>
        <span aria-current="page">${spotNameEsc}</span>
    </nav>
    <h2 id="spot-name">${spotNameEsc}</h2>

    <p id="area" class="detail-meta"><i data-lucide="map-pin"></i> <span>エリア: ${areaLinkHTML}</span></p>
    <p id="rating" class="detail-meta"><i data-lucide="star"></i> <span>評価: ${spotRatingEsc}</span></p>

    <div id="detail-fields">
${fieldsHTML}    </div>
    ${checkedHTML}
    <p class="information-caution">最新の情報は公式サイト等でご確認ください</p>

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

    ${visitedHTML}    <div id="description" class="detail-description">
        ${bodyParagraphsHTML}
    </div>
</div>

${affiliateHTML ? `${affiliateHTML}\n\n` : ''}${relatedSpotsHTML}

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
    <p class="footer-links"><a href="../../about.html">運営者情報</a> / <a href="../../privacy.html">プライバシーポリシー</a> / <a href="../../contact.html">お問い合わせ</a></p>
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
    const affiliates = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'affiliates.json'), 'utf8'));
    const articles = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'articles.json'), 'utf8'));
    const areas = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'areas.json'), 'utf8'));
    if (!Array.isArray(areas)) throw new Error('data/areas.json must contain an array');
    const areaSlugs = new Set();
    const areaNames = new Set();
    areas.forEach(area => {
        if (!area || typeof area.name !== 'string' || !area.name || typeof area.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(area.slug)) {
            throw new Error(`Invalid area entry: ${JSON.stringify(area)}`);
        }
        if (areaSlugs.has(area.slug)) throw new Error(`Duplicate area slug: ${area.slug}`);
        if (areaNames.has(area.name)) throw new Error(`Duplicate area name: ${area.name}`);
        areaSlugs.add(area.slug);
        areaNames.add(area.name);
    });
    const areasByName = new Map(areas.map(area => [area.name, area]));
    const allSpots = Object.entries(CATEGORY_FILES).flatMap(([category, fileName]) => {
        const spots = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', fileName), 'utf8'));
        return spots.map(spot => ({ spot, category }));
    });
    const imageMap = Object.fromEntries(allSpots.map(({ spot }) => [spot.slug, resolveSpotImage(rootDir, spot)]));
    allSpots.forEach(({ spot }) => { spot.image = imageMap[spot.slug]; });
    writeStatusReport(rootDir, allSpots, articles);
    const generatedDir = path.join(rootDir, 'data', 'generated');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(generatedDir, 'images.json'), `${JSON.stringify(imageMap, null, 2)}\n`, 'utf8');
    const spotsById = new Map(allSpots.map(entry => [entry.spot.id, entry]));
    const spotsByArea = new Map();
    allSpots.forEach(entry => {
        if (!areasByName.has(entry.spot.area)) {
            throw new Error(`Spot area is not registered: ${entry.spot.id} - ${entry.spot.area}`);
        }
        if (!spotsByArea.has(entry.spot.area)) spotsByArea.set(entry.spot.area, []);
        spotsByArea.get(entry.spot.area).push(entry);
    });

    const sitemapUrls = [
        { loc: `${BASE_URL}index.html`, priority: '1.0' },
        { loc: `${BASE_URL}about.html`, priority: '0.5' },
        { loc: `${BASE_URL}privacy.html`, priority: '0.5' },
        { loc: `${BASE_URL}contact.html`, priority: '0.5' },
        { loc: `${BASE_URL}articles/index.html`, priority: '0.7' },
        { loc: `${BASE_URL}areas/index.html`, priority: '0.7' },
    ];

    let spotCount = 0;

    Object.entries(CATEGORY_FILES).forEach(([category, fileName]) => {
        const jsonPath = path.join(rootDir, 'data', fileName);
        const spots = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        spots.forEach(spot => { spot.image = imageMap[spot.slug] || spot.image; });

        const categoryDir = path.join(spotsDir, category);
        fs.mkdirSync(categoryDir, { recursive: true });

        const categoryIndexPath = path.join(categoryDir, 'index.html');
        fs.writeFileSync(categoryIndexPath, generateCategoryPageHTML(category, spots), 'utf8');
        sitemapUrls.push({
            loc: `${BASE_URL}spots/${category}/index.html`,
            priority: '0.8',
        });

        spots.forEach(spot => {
            if (!spot.slug) {
                throw new Error(`Spot missing slug: ${spot.id} - ${spot.name}`);
            }
            const htmlContent = generateSpotHTML(spot, category, affiliates, allSpots, areasByName);
            const htmlPath = path.join(categoryDir, `${spot.slug}.html`);
            fs.writeFileSync(htmlPath, htmlContent, 'utf8');

            sitemapUrls.push({
                loc: `${BASE_URL}spots/${category}/${spot.slug}.html`,
                priority: '0.6',
            });
            spotCount++;
        });
    });

    const articlesDir = path.join(rootDir, 'articles');
    fs.mkdirSync(articlesDir, { recursive: true });
    fs.writeFileSync(path.join(articlesDir, 'index.html'), generateArticlesIndexHTML(articles), 'utf8');

    let articleCount = 0;
    const articleSlugs = new Set();
    articles.forEach(article => {
        if (!article || typeof article.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
            throw new Error(`Invalid article slug: ${article && article.slug}`);
        }
        if (articleSlugs.has(article.slug)) throw new Error(`Duplicate article slug: ${article.slug}`);
        articleSlugs.add(article.slug);

        const articlePath = path.join(articlesDir, `${article.slug}.html`);
        if (article.draft) {
            if (fs.existsSync(articlePath)) fs.unlinkSync(articlePath);
            return;
        }

        fs.writeFileSync(articlePath, generateArticleHTML(article, spotsById), 'utf8');
        sitemapUrls.push({
            loc: `${BASE_URL}articles/${article.slug}.html`,
            priority: '0.6',
        });
        articleCount++;
    });

    const areasDir = path.join(rootDir, 'areas');
    fs.mkdirSync(areasDir, { recursive: true });
    const sortedAreas = [...areas].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    fs.writeFileSync(path.join(areasDir, 'index.html'), generateAreasIndexHTML(sortedAreas, spotsByArea), 'utf8');
    sortedAreas.forEach(area => {
        const areaPath = path.join(areasDir, `${area.slug}.html`);
        const areaSpots = [...(spotsByArea.get(area.name) || [])];
        fs.writeFileSync(areaPath, generateAreaPageHTML(area, areaSpots), 'utf8');
        sitemapUrls.push({
            loc: `${BASE_URL}areas/${area.slug}.html`,
            priority: '0.6',
        });
    });

    // Generate sitemap.xml
    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;

    fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapXML, 'utf8');

    console.log(`Successfully generated ${spotCount} spot HTML files, ${articleCount} article HTML files, ${areas.length} area pages plus their index, and sitemap.xml.`);
}

build();
