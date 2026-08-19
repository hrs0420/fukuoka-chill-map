/*
 * トップページ（index.html）専用のスクリプト。
 * カフェ・サウナ・ランニングの一覧絞り込みロジックは list.js に統合したため、
 * ここには「高評価TOP3」と「新着口コミ」の表示だけが残っている。
 */

let cafes = [];

async function init() {
    try {
        const response = await fetch("data/cafes.json");
        if (response.ok) {
            cafes = await response.json();
        }
    } catch (error) {
        console.error("カフェデータの読み込みエラー:", error);
    }

    displayTopRanking();
    displayRecentReviews();
}

document.addEventListener("DOMContentLoaded", init);


// --- トップページ：高評価 TOP3 の描画 ---
function displayTopRanking() {
    const topListContainer = document.getElementById("top-rated-list");
    if (!topListContainer) return;

    if (cafes.length === 0) {
        topListContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>データを読み込み中...</p>";
        return;
    }

    const top3 = [...cafes]
        .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
        .slice(0, 3);

    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    topListContainer.innerHTML = "";
    top3.forEach(cafe => {
        const isFav = favorites.includes(cafe.name);
        const heartIcon = isFav ? "❤️" : "🤍";

        topListContainer.innerHTML += `
            <div class="card">
                <a href="detail.html?name=${encodeURIComponent(cafe.name)}&type=cafe" class="card-link">
                    <div class="card-media">
                        <img src="${cafe.image || 'images/default.jpg'}" alt="${escapeHTML(cafe.name)}" class="cafe-image">
                        <span class="rating-badge">⭐ ${cafe.rating || '0.0'}</span>
                    </div>
                    <div class="card-body">
                        <h3>${escapeHTML(cafe.name)}</h3>
                        <p class="card-area">📍 ${escapeHTML(cafe.area || '福岡')}</p>
                        <p class="card-desc">${escapeHTML(cafe.description || '')}</p>
                    </div>
                </a>
                <span class="favorite" data-name="${escapeHTML(cafe.name)}">${heartIcon}</span>
            </div>
        `;
    });
}


// --- トップページ：口コミの収集（JSON由来＋localStorage由来をまとめる） ---
function collectAllReviews() {
    const jsonReviews = [];
    cafes.forEach(cafe => {
        if (cafe.reviews && Array.isArray(cafe.reviews)) {
            cafe.reviews.forEach(r => {
                jsonReviews.push({
                    spotName: cafe.name,
                    author: r.author || r.name || '匿名',
                    score: parseInt(r.score || r.rating) || 5,
                    comment: r.comment || r.text || '',
                    isLocal: false,
                });
            });
        }
    });

    const localReviews = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("comments_")) continue;

        const spotName = key.replace(/^comments_/, "");
        const saved = JSON.parse(localStorage.getItem(key)) || [];

        if (Array.isArray(saved)) {
            saved.forEach((r, idx) => {
                localReviews.push({
                    spotName,
                    author: r.name || r.author || '匿名',
                    score: parseInt(r.score || r.rating) || 5,
                    comment: r.comment || r.text || '',
                    isLocal: true,
                    storageKey: key,
                    localIndex: idx,
                });
            });
        }
    }

    return [...jsonReviews, ...localReviews];
}

// --- トップページ：新着口コミの描画（通常時は4件のみ／管理者モードは全件＋削除可） ---
function displayRecentReviews() {
    const recentContainer = document.getElementById("recent-reviews-list");
    if (!recentContainer) return;

    const isAdmin = document.body.classList.contains("admin-mode");
    const allReviews = collectAllReviews();

    const headingEl = document.getElementById("recent-reviews-heading");
    if (headingEl) {
        headingEl.textContent = isAdmin
            ? `💬 口コミ管理（全${allReviews.length}件）`
            : "💬 新着の口コミ";
    }

    recentContainer.innerHTML = "";

    if (allReviews.length === 0) {
        recentContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>まだ口コミが投稿されていません。</p>";
        return;
    }

    const reversed = [...allReviews].reverse();
    const listToShow = isAdmin ? reversed : reversed.slice(0, 4);

    listToShow.forEach(review => {
        const stars = "★".repeat(review.score) + "☆".repeat(Math.max(0, 5 - review.score));

        const deleteBtn = review.isLocal
            ? `<button class="delete-btn" data-storage-key="${review.storageKey}" data-index="${review.localIndex}">削除</button>`
            : "";

        recentContainer.innerHTML += `
            <div class="review-mini-card">
                <div class="review-mini-header">
                    <h4>${escapeHTML(review.spotName)}</h4>
                    ${deleteBtn}
                </div>
                <div class="stars">${stars}</div>
                <p style="font-size: 14px; margin: 8px 0; color: #444;">"${escapeHTML(review.comment)}"</p>
                <span style="font-size: 12px; color: #888;">by ${escapeHTML(review.author)}</span>
            </div>
        `;
    });
}

// --- 管理者モードでの口コミ削除（トップページ） ---
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("delete-btn")) return;
    if (!e.target.closest("#recent-reviews-list")) return;

    e.preventDefault();

    const storageKey = e.target.dataset.storageKey;
    const index = parseInt(e.target.dataset.index);
    if (!storageKey || isNaN(index)) return;

    if (!confirm("この口コミを削除しますか？")) return;

    const reviews = JSON.parse(localStorage.getItem(storageKey)) || [];
    reviews.splice(index, 1);

    if (reviews.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(reviews));
    } else {
        localStorage.removeItem(storageKey);
    }

    displayRecentReviews();
});

// --- 管理者モードのON/OFF切り替えを検知して再描画 ---
document.addEventListener("adminModeChanged", () => {
    displayRecentReviews();
});

// --- いいね（お気に入り）クリックイベント：トップページの高評価TOP3用 ---
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("favorite")) return;

    e.preventDefault();
    e.stopPropagation();

    const name = e.target.dataset.name;
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    if (favorites.includes(name)) {
        favorites = favorites.filter(f => f !== name);
        e.target.textContent = "🤍";
    } else {
        favorites.push(name);
        e.target.textContent = "❤️";
    }

    localStorage.setItem("favorites", JSON.stringify(favorites));
});


// --- HTMLエスケープ処理 ---
function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}
