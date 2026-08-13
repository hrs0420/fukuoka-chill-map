let cafes = [];

// --- データの読み込み & 初期表示 ---
async function init() {
    try {
        const response = await fetch("data/cafes.json");
        if (response.ok) {
            cafes = await response.json();
        }
    } catch (error) {
        console.error("カフェデータの読み込みエラー:", error);
    }

    // データの読み込み成否に関わらず各描画処理を実行
    displayTopRanking();
    displayRecentReviews();
    filterCafes();
    setupEventListeners();
}

// ページ読み込み完了時に実行
document.addEventListener("DOMContentLoaded", init);


// --- イベントリスナーの一括設定 ---
function setupEventListeners() {
    const searchInput = document.getElementById("search");
    const wifiCheck = document.getElementById("wifi");
    const outletCheck = document.getElementById("outlet");
    const areaSelect = document.getElementById("area");

    if (searchInput) searchInput.addEventListener("input", filterCafes);
    if (wifiCheck) wifiCheck.addEventListener("change", filterCafes);
    if (outletCheck) outletCheck.addEventListener("change", filterCafes);
    if (areaSelect) areaSelect.addEventListener("change", filterCafes);
}


// --- トップページ：高評価 TOP3 の描画 ---
function displayTopRanking() {
    const topListContainer = document.getElementById("top-rated-list");
    if (!topListContainer) return;

    if (cafes.length === 0) {
        topListContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>データを読み込み中...</p>";
        return;
    }

    // 評価（rating）が高い順にソートしてTOP3を取得
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
                <span class="favorite" data-name="${escapeHTML(cafe.name)}">${heartIcon}</span>
                <a href="detail.html?name=${encodeURIComponent(cafe.name)}&type=cafe" class="card-link">
                    <img src="${cafe.image || 'images/default.jpg'}" alt="${escapeHTML(cafe.name)}" class="cafe-image">
                    <h3>${escapeHTML(cafe.name)}</h3>
                    <p>📍 ${escapeHTML(cafe.area || '福岡')}</p>
                    <p>⭐ ${cafe.rating || '0.0'}</p>
                    <p style="font-size: 13px; color: #666;">${escapeHTML(cafe.description || '')}</p>
                </a>
            </div>
        `;
    });
}


// --- トップページ：新着口コミの描画 ---
// --- トップページ：新着口コミの描画（実際のデータのみ） ---
// --- トップページ：新着口コミの描画（詳細ページの投稿データを自動全取得） ---
function displayRecentReviews() {
    const recentContainer = document.getElementById("recent-reviews-list");
    if (!recentContainer) return;

    let allReviews = [];

    // 1. JSONから元々の口コミを集める（もしあれば）
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

    // 2. detail.js で LocalStorage に保存された店舗別口コミ（`comments_店舗名`）をすべて検索して取得
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // "comments_" または "reviews_" で始まるキーを探す
        if (key && (key.startsWith("comments_") || key.startsWith("reviews_"))) {
            // キー名からスポット名を取り出す（例: "comments_BASKING COFFEE ropponmatsu" -> "BASKING COFFEE ropponmatsu"）
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

    // 3. 単体キー (user_reviews) がある場合も念のため合体
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

    // 口コミが全くない場合
    if (allReviews.length === 0) {
        recentContainer.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>まだ口コミが投稿されていません。</p>";
        return;
    }

    // 最新の口コミ（配列の後ろにあるもの）から最大4件を取り出して表示
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

// --- カフェ一覧：絞り込み & 描画処理 ---
function filterCafes() {
    const list = document.getElementById("cafe-list");
    if (!list) return;

    const searchInput = document.getElementById("search");
    const wifiCheck = document.getElementById("wifi");
    const outletCheck = document.getElementById("outlet");
    const areaSelect = document.getElementById("area");

    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const isWifiOnly = wifiCheck ? wifiCheck.checked : false;
    const isOutletOnly = outletCheck ? outletCheck.checked : false;
    const selectedArea = areaSelect ? areaSelect.value : "";

    const filteredCafes = cafes.filter(cafe => {
        const matchesKeyword = cafe.name.toLowerCase().includes(keyword) || 
                               (cafe.description && cafe.description.toLowerCase().includes(keyword));
        const matchesWifi = !isWifiOnly || cafe.wifi === true;
        const matchesOutlet = !isOutletOnly || cafe.outlet === true;
        const matchesArea = !selectedArea || cafe.area === selectedArea;

        return matchesKeyword && matchesWifi && matchesOutlet && matchesArea;
    });

    displayCafes(filteredCafes);
}


// --- カフェカードのレンダリング ---
function displayCafes(cafeList) {
    const list = document.getElementById("cafe-list");
    if (!list) return;

    list.innerHTML = "";

    if (cafeList.length === 0) {
        list.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>条件に合うカフェが見つかりませんでした。</p>";
        return;
    }

    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    cafeList.forEach(cafe => {
        const isFav = favorites.includes(cafe.name);
        const heartIcon = isFav ? "❤️" : "🤍";

        list.innerHTML += `
            <div class="card">
                <span class="favorite" data-name="${escapeHTML(cafe.name)}">${heartIcon}</span>
                <a href="detail.html?name=${encodeURIComponent(cafe.name)}&type=cafe" class="card-link">
                    <img src="${cafe.image || 'images/default.jpg'}" alt="${escapeHTML(cafe.name)}" class="cafe-image">
                    <h3>${escapeHTML(cafe.name)}</h3>
                    <p>📍 ${escapeHTML(cafe.area || '福岡')}</p>
                    <p>⭐ ${cafe.rating || '0.0'}</p>
                    <p style="font-size: 13px; color: #666;">${escapeHTML(cafe.description || '')}</p>
                </a>
            </div>
        `;
    });
}


// --- いいね（お気に入り）クリックイベント ---
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