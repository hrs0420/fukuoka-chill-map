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


// --- トップページ：新着口コミの描画（detail.jsでLocalStorageに保存された口コミを自動収集） ---
function displayRecentReviews() {
    const recentContainer = document.getElementById("recent-reviews-list");
    if (!recentContainer) return;

    let allReviews = [];

    cafes.forEach(cafe => {
        if (cafe.reviews && Array.isArray(cafe.reviews)) {
            cafe.reviews.forEach(r => {
                allReviews.push({
                    spotName: cafe.name,
                    author: r.author || '匿名',
                    score: parseInt(r.score) || 5,
                    comment: r.comment || ''
                });
            });
        }
    });

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && (key.startsWith("comments_") || key.startsWith("reviews_"))) {
            const spotName = key.replace(/^(comments_|reviews_)/, "");
            const savedReviews = JSON.parse(localStorage.getItem(key)) || [];

            if (Array.isArray(savedReviews)) {
                savedReviews.forEach(r => {
                    allReviews.push({
                        spotName: spotName,
                        author: r.name || r.author || r.reviewerName || '匿名',
                        score: parseInt(r.score || r.rating) || 5,
                        comment: r.comment || r.text || ''
                    });
                });
            }
        }
    }

    const userReviews = JSON.parse(localStorage.getItem("user_reviews")) || [];
    if (Array.isArray(userReviews)) {
        userReviews.forEach(r => {
            allReviews.push({
                spotName: r.spotName || r.cafeName || 'スポット',
                author: r.author || r.name || '匿名',
                score: parseInt(r.score) || 5,
                comment: r.comment || ''
            });
        });
    }

    recentContainer.innerHTML = "";

    if (allReviews.length === 0) {
        recentContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>まだ口コミが投稿されていません。</p>";
        return;
    }

    const recent4 = allReviews.reverse().slice(0, 4);

    recent4.forEach(review => {
        const stars = "★".repeat(review.score) + "☆".repeat(5 - review.score);
        recentContainer.innerHTML += `
            <div class="review-mini-card">
                <h4>${escapeHTML(review.spotName)}</h4>
                <div class="stars">${stars}</div>
                <p style="font-size: 14px; margin: 8px 0; color: #444;">"${escapeHTML(review.comment)}"</p>
                <span style="font-size: 12px; color: #888;">by ${escapeHTML(review.author)}</span>
            </div>
        `;
    });
}


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
