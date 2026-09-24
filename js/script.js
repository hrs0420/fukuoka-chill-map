/*
 * トップページ（index.html）専用のスクリプト。
 * 「高評価TOP3（全カテゴリ横断）」と「新着口コミ」を表示する。
 */

// 全カテゴリのスポット（各要素に _category を付けて保持）
let allSpots = [];

async function init() {
    for (const [key, cfg] of Object.entries(CATEGORY_CONFIG)) {
        try {
            const spots = await getCombinedSpots(cfg);
            spots.forEach(s => allSpots.push({ ...s, _category: key }));
        } catch (error) {
            console.error(`${key} の読み込みエラー:`, error);
        }
    }

    displayTopRanking();
    displayRecentReviews();
    if (window.lucide) lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", init);

// --- 高評価 TOP3（全カテゴリから評価順） ---
function displayTopRanking() {
    const container = document.getElementById("top-rated-list");
    if (!container) return;

    if (allSpots.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>データを読み込めませんでした。</p>";
        return;
    }

    const top3 = [...allSpots]
        .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
        .slice(0, 3);

    container.innerHTML = top3.map(spot => {
        const cfg = CATEGORY_CONFIG[spot._category];
        const favorites = JSON.parse(localStorage.getItem(cfg.storageKey)) || [];
        const heart = favorites.includes(spot.name) ? "❤️" : "🤍";

        const detailUrl = spot.slug
            ? `spots/${cfg.type}/${spot.slug}.html`
            : `detail.html?name=${encodeURIComponent(spot.name)}&type=${cfg.type}`;

        return `
            <div class="card">
                <a href="${detailUrl}" class="card-link">
                    <div class="card-media">
                        <img src="${escapeHTML(spot.image || "images/default.jpg")}" alt="${escapeHTML(spot.name)}" class="cafe-image" loading="lazy">
                        <span class="rating-badge">⭐ ${escapeHTML(spot.rating || "0.0")}</span>
                    </div>
                    <div class="card-body">
                        <h3>${escapeHTML(spot.name)}</h3>
                        <p class="card-area">📍 ${escapeHTML(spot.area || "福岡")}</p>
                        <p class="card-desc">${escapeHTML(spot.description || "")}</p>
                    </div>
                </a>
                <span class="favorite" data-name="${escapeHTML(spot.name)}" data-key="${cfg.storageKey}">${heart}</span>
            </div>
        `;
    }).join("");
}

// --- 口コミの収集（JSON由来 + この端末のlocalStorage由来） ---
function collectAllReviews() {
    const reviews = [];

    allSpots.forEach(spot => {
        (Array.isArray(spot.reviews) ? spot.reviews : []).forEach(r => {
            reviews.push({
                spotName: spot.name,
                author: r.author || r.name || "匿名",
                score: parseInt(r.score || r.rating) || 5,
                comment: r.comment || r.text || "",
            });
        });
    });

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("comments_")) continue;
        let saved = [];
        try { saved = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { continue; }
        if (!Array.isArray(saved)) continue;

        saved.forEach(r => {
            reviews.push({
                spotName: key.replace(/^comments_/, ""),
                author: r.name || r.author || "匿名",
                score: parseInt(r.score || r.rating) || 5,
                comment: r.comment || r.text || "",
            });
        });
    }
    return reviews;
}

// --- 新着口コミ（4件） ---
function displayRecentReviews() {
    const container = document.getElementById("recent-reviews-list");
    if (!container) return;

    const list = collectAllReviews().reverse().slice(0, 4);

    if (list.length === 0) {
        container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>まだ口コミが投稿されていません。</p>";
        return;
    }

    container.innerHTML = list.map(r => {
        const score = Math.min(5, Math.max(0, r.score));
        const stars = "★".repeat(score) + "☆".repeat(5 - score);
        return `
            <div class="review-mini-card">
                <div class="review-mini-header">
                    <h4>${escapeHTML(r.spotName)}</h4>
                </div>
                <div class="stars">${stars}</div>
                <p style="font-size: 14px; margin: 8px 0; color: #444;">"${escapeHTML(r.comment)}"</p>
                <span style="font-size: 12px; color: #888;">by ${escapeHTML(r.author)}</span>
            </div>
        `;
    }).join("");
}

// --- お気に入り切り替え（カテゴリごとのキーに保存） ---
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("favorite")) return;
    e.preventDefault();
    e.stopPropagation();

    const name = e.target.dataset.name;
    const storageKey = e.target.dataset.key;
    if (!storageKey) return;

    let favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
    if (favorites.includes(name)) {
        favorites = favorites.filter(f => f !== name);
        e.target.textContent = "🤍";
    } else {
        favorites.push(name);
        e.target.textContent = "❤️";
    }
    localStorage.setItem(storageKey, JSON.stringify(favorites));
});
