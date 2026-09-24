/*
 * スポット詳細ページ（カフェ・サウナ・ランニング共通）
 *
 * ★ここが重要★
 * 「どのカテゴリでどの項目を表示するか」は FIELD_CONFIG だけで管理する。
 * 新しい項目を増やしたい／減らしたい場合は、この FIELD_CONFIG を編集するだけでよい。
 * HTML側（detail.html）には項目を追加・削除する必要は一切ない。
 */

// カテゴリごとの表示項目定義
// key   : JSONのプロパティ名
// label : 画面に出すラベル
// icon  : 絵文字
// type  : "bool"（true/false系） or "text"（文字列そのまま）
// trueText / falseText : bool項目で「あり/なし」以外の表現にしたい場合に指定
// カテゴリ名 → JSONファイル名
// ※ categories.js の CATEGORY_CONFIG から生成する（ファイル名をここで二重に持たない）
const DATA_FILES = Object.fromEntries(
    Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => [key, cfg.dataFile])
);

document.addEventListener("DOMContentLoaded", async () => {
    // 静的生成ページの <body> に data-spot-name と data-spot-type がある場合
    const bodySpotName = document.body.dataset.spotName;
    const bodySpotType = document.body.dataset.spotType;

    const params = new URLSearchParams(window.location.search);
    const rawName = bodySpotName || params.get("name") || params.get("id");
    const typeParam = bodySpotType || params.get("type"); // "cafe" | "sauna" | "running"

    if (!rawName) {
        alert("スポット情報が見つかりません。");
        window.location.href = "index.html";
        return;
    }

    const cleanName = decodeURIComponent(rawName).trim();

    async function fetchCombined(categoryKey) {
        const cfg = CATEGORY_CONFIG[categoryKey];
        if (!cfg) return [];
        try {
            return await getCombinedSpots(cfg);
        } catch (err) {
            console.error(`データ読み込みエラー(${categoryKey}):`, err);
            return [];
        }
    }

    let spot = null;
    let spotType = typeParam && CATEGORY_CONFIG[typeParam] ? typeParam : null;

    if (spotType) {
        const data = await fetchCombined(spotType);
        spot = data.find(s => matchSpot(s, cleanName));
    } else {
        for (const key of Object.keys(CATEGORY_CONFIG)) {
            const data = await fetchCombined(key);
            const found = data.find(s => matchSpot(s, cleanName));
            if (found) {
                spot = found;
                spotType = key;
                break;
            }
        }
    }

    if (!spot) {
        if (!bodySpotName) {
            alert("スポットが見つかりませんでした。");
            window.location.href = "index.html";
        }
        return;
    }

    function matchSpot(s, name) {
        if (!s) return false;
        const sName = (s.name || "").trim();
        const sId = String(s.id || "").trim();
        const sSlug = (s.slug || "").trim();
        return sName === name || sId === name || sSlug === name;
    }

    // 旧URL(detail.html?name=...&type=...)でアクセスされた場合、該当する新URLへリダイレクト
    if (!bodySpotName && spot.slug) {
        const canonicalUrl = `https://hrs0420.github.io/fukuoka-chill-map/spots/${spotType}/${spot.slug}.html`;
        let canonicalTag = document.querySelector('link[rel="canonical"]');
        if (!canonicalTag) {
            canonicalTag = document.createElement("link");
            canonicalTag.setAttribute("rel", "canonical");
            document.head.appendChild(canonicalTag);
        }
        canonicalTag.setAttribute("href", canonicalUrl);

        const redirectUrl = `spots/${spotType}/${spot.slug}.html`;
        window.location.replace(redirectUrl);
        return;
    }

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // タイトル・基本情報
    setText("title", spot.name);
    setText("spot-name", spot.name);

    const areaEl = document.getElementById("area");
    if (areaEl) {
        areaEl.className = "detail-meta";
        areaEl.innerHTML = `<i data-lucide="map-pin"></i> <span>エリア: ${escapeHTML(spot.area || "情報なし")}</span>`;
    }

    const ratingEl = document.getElementById("rating");
    if (ratingEl) {
        ratingEl.className = "detail-meta";
        ratingEl.innerHTML = `<i data-lucide="star"></i> <span>評価: ${escapeHTML(spot.rating || "0.0")}</span>`;
    }

    // カテゴリ固有項目をFIELD_CONFIGに沿って動的に生成
    const fieldsContainer = document.getElementById("detail-fields");
    if (fieldsContainer) {
        fieldsContainer.innerHTML = "";

        (FIELD_CONFIG[spotType] || []).forEach(field => {
            if (spot[field.key] === undefined || spot[field.key] === null || spot[field.key] === "") return;

            let valueText;
            if (field.type === "bool") {
                valueText = spot[field.key]
                    ? (field.trueText || "あり")
                    : (field.falseText || "なし");
            } else {
                valueText = spot[field.key];
            }

            const p = document.createElement("p");
            p.className = "detail-field";
            p.innerHTML = `<i data-lucide="${field.icon}"></i> <span>${field.label}: ${escapeHTML(valueText)}</span>`;
            fieldsContainer.appendChild(p);
        });
    }

    if (window.lucide) lucide.createIcons();

    const addressEl = document.getElementById("address");
    if (addressEl) {
        if (spot.address) {
            addressEl.className = "detail-meta";
            addressEl.innerHTML = `<i data-lucide="home"></i> <span>住所: ${escapeHTML(spot.address)}</span>`;
            addressEl.style.display = "flex";
        } else {
            addressEl.style.display = "none";
        }
    }

    setText("description", spot.description || "");


    // Googleマップ
    const searchTarget = spot.address || spot.name;
    const encodedQuery = encodeURIComponent(searchTarget);

    const mapIframe = document.getElementById("google-map");
    if (mapIframe && !mapIframe.src) {
        mapIframe.src = `https://maps.google.co.jp/maps?q=${encodedQuery}&output=embed&z=15`;
    }

    const mapLink = document.getElementById("mapLink");
    if (mapLink) {
        mapLink.href = spot.map || `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    }

    // サウナイキタイのリンク（サウナのデータにしか無い）
    const ikitaiLink = document.getElementById("ikitaiLink");
    if (ikitaiLink) {
        if (spot.ikitai) {
            ikitaiLink.href = spot.ikitai;
            ikitaiLink.style.display = "inline-block";
        } else {
            ikitaiLink.style.display = "none";
        }
    }

    // 口コミ機能の初期化
    initReviews(spot.name, spot.reviews || []);
    if (window.lucide) lucide.createIcons();
});


// --- 口コミ管理機能（カテゴリ共通） ---
function initReviews(spotName, jsonReviews) {
    const storageKey = `comments_${spotName}`;
    const form = document.getElementById("comment-form");
    const commentsList = document.getElementById("comments-list");
    const avgRatingEl = document.getElementById("average-rating");
    const countTextEl = document.getElementById("review-count");

/* 変更後 */
    function buildStarIcons(score) {
        let html = "";
        for (let i = 0; i < 5; i++) {
            const filled = i < score;
            html += `<i data-lucide="star" class="${filled ? "star-filled" : "star-empty"}"></i>`;
        }
        return `<span class="stars-row">${html}</span>`;
    }

    function renderReviews() {
        const localReviews = JSON.parse(localStorage.getItem(storageKey)) || [];

        const fromJson = Array.isArray(jsonReviews) ? jsonReviews.map(r => ({
            name: r.author || r.name || "匿名",
            score: parseInt(r.score || r.rating) || 5,
            comment: r.comment || r.text || "",
            date: "投稿済み",
            isLocal: false,
        })) : [];

        const fromLocal = localReviews.map((r, index) => ({
            name: r.name || r.author || "匿名",
            score: parseInt(r.score || r.rating) || 5,
            comment: r.comment || r.text || "",
            date: r.date || "",
            isLocal: true,
            localIndex: index,
        }));

        const allReviews = [...fromJson, ...fromLocal];

        if (!commentsList) return;
        commentsList.innerHTML = "";

        if (allReviews.length === 0) {
            commentsList.innerHTML = "<p style='color:#888;'>まだ口コミはありません。</p>";
            if (avgRatingEl) avgRatingEl.innerHTML = `<i data-lucide="star"></i> 0.0`;
            if (countTextEl) countTextEl.textContent = "(0件の口コミ)";
            if (window.lucide) lucide.createIcons();
            return;
        }

        const totalScore = allReviews.reduce((sum, r) => sum + r.score, 0);
        const avgScore = (totalScore / allReviews.length).toFixed(1);

        if (avgRatingEl) avgRatingEl.innerHTML = `<i data-lucide="star"></i> ${avgScore}`;
        if (countTextEl) countTextEl.textContent = `(${allReviews.length}件の口コミ)`;

        [...allReviews].reverse().forEach(r => {
            const starsHTML = buildStarIcons(r.score);

            const deleteBtn = r.isLocal
                ? `<button class="delete-btn" data-index="${r.localIndex}">削除</button>`
                : "";

            commentsList.innerHTML += `
                <div class="comment-card">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(r.name)}</span>
                        <span class="comment-score">${starsHTML}${deleteBtn}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(r.comment)}</p>
                    ${r.date ? `<div class="comment-date">${escapeHTML(r.date)}</div>` : ""}
                </div>
            `;
        });

        if (window.lucide) lucide.createIcons();
    }

    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();

            const nameInput = document.getElementById("reviewer-name");
            const scoreSelect = document.getElementById("review-score");
            const commentInput = document.getElementById("review-comment");

            const newReview = {
                name: nameInput ? nameInput.value.trim() || "匿名" : "匿名",
                score: scoreSelect ? parseInt(scoreSelect.value) : 5,
                comment: commentInput ? commentInput.value.trim() : "",
                date: new Date().toLocaleDateString("ja-JP"),
            };

            const localReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
            localReviews.push(newReview);
            localStorage.setItem(storageKey, JSON.stringify(localReviews));

            if (nameInput) nameInput.value = "";
            if (commentInput) commentInput.value = "";
            if (scoreSelect) scoreSelect.value = "3";

            renderReviews();

            const modal = document.getElementById("custom-modal");
            if (modal) modal.classList.add("active");
        };
    }

    // 削除ボタンのクリック処理（イベント委譲：後から追加される要素にも効く）
    if (commentsList) {
        commentsList.addEventListener("click", (e) => {
            if (!e.target.classList.contains("delete-btn")) return;

            const index = parseInt(e.target.dataset.index);
            if (isNaN(index)) return;

            if (!confirm("この口コミを削除しますか？")) return;

            const localReviews = JSON.parse(localStorage.getItem(storageKey)) || [];
            localReviews.splice(index, 1); // 該当の1件だけ取り除く
            localStorage.setItem(storageKey, JSON.stringify(localReviews));

            renderReviews();
        });
    }

    renderReviews();
}
