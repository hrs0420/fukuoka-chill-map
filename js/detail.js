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
const FIELD_CONFIG = {
    cafe: [
        { key: "wifi", label: "Wi-Fi", icon: "📶", type: "bool" },
        { key: "outlet", label: "電源", icon: "🔌", type: "bool" },
        { key: "parking", label: "駐車場", icon: "🅿️", type: "bool" },
        { key: "hours", label: "営業時間", icon: "🕒", type: "text" },
        { key: "closed", label: "定休日", icon: "🗓️", type: "text" },
        { key: "payment", label: "決済方法", icon: "💳", type: "text" },
    ],
    sauna: [
        { key: "onsen", label: "温泉", icon: "♨️", type: "bool" },
        { key: "loyly", label: "ロウリュ", icon: "🔥", type: "bool" },
        { key: "stay", label: "宿泊", icon: "🛌", type: "bool", trueText: "可能", falseText: "不可" },
        { key: "parking", label: "駐車場", icon: "🅿️", type: "bool" },
        { key: "hours", label: "営業時間", icon: "🕒", type: "text" },
    ],
    running: [
        { key: "distance", label: "1周", icon: "🏃", type: "text" },
        { key: "surface", label: "路面", icon: "🛣", type: "text" },
        { key: "lighted", label: "ナイター(夜間照明)", icon: "💡", type: "bool" },
        { key: "locker", label: "ロッカー", icon: "🎒", type: "bool" },
        { key: "bathroom", label: "トイレ", icon: "🚽", type: "bool" },
    ],
};

// カテゴリ名 → JSONファイル名
const DATA_FILES = {
    cafe: "cafes.json",
    sauna: "saunas.json",
    running: "running.json",
};

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const rawName = params.get("name") || params.get("id");
    const typeParam = params.get("type"); // "cafe" | "sauna" | "running"（一覧ページのリンクから渡ってくる）

    if (!rawName) {
        alert("スポット情報が見つかりません。");
        window.location.href = "index.html";
        return;
    }

    const cleanName = decodeURIComponent(rawName).trim();

    async function fetchJSON(fileName) {
        try {
            const res = await fetch(`data/${fileName}`);
            return res.ok ? await res.json() : [];
        } catch (err) {
            console.error(`データ読み込みエラー(${fileName}):`, err);
            return [];
        }
    }

    let spot = null;
    let spotType = typeParam && DATA_FILES[typeParam] ? typeParam : null;

    if (spotType) {
        // typeが分かっている場合はそのJSONだけ読めばよい（無駄なfetchをしない）
        const data = await fetchJSON(DATA_FILES[spotType]);
        spot = data.find(s => matchSpot(s, cleanName));
    } else {
        // typeが無いリンクからアクセスされた場合の後方互換：3種類とも探す
        for (const [key, file] of Object.entries(DATA_FILES)) {
            const data = await fetchJSON(file);
            const found = data.find(s => matchSpot(s, cleanName));
            if (found) {
                spot = found;
                spotType = key;
                break;
            }
        }
    }

    if (!spot) {
        alert("スポットが見つかりませんでした。");
        window.location.href = "index.html";
        return;
    }

    function matchSpot(s, name) {
        if (!s) return false;
        const sName = (s.name || "").trim();
        const sId = String(s.id || "").trim();
        return sName === name || sId === name;
    }

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // タイトル・基本情報
    setText("title", spot.name);
    setText("spot-name", spot.name);
    setText("area", `📍 エリア: ${spot.area || "情報なし"}`);
    setText("rating", `⭐ 評価: ${spot.rating || "0.0"}`);

    // カテゴリ固有項目をFIELD_CONFIGに沿って動的に生成
    const fieldsContainer = document.getElementById("detail-fields");
    fieldsContainer.innerHTML = "";

    (FIELD_CONFIG[spotType] || []).forEach(field => {
        // JSON側にそのキーが無ければ何も表示しない
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
        p.textContent = `${field.icon} ${field.label}: ${valueText}`;
        fieldsContainer.appendChild(p);
    });

    // 住所（無いデータ＝ running.json もあるので、ある場合だけ表示）
    const addressEl = document.getElementById("address");
    if (spot.address) {
        addressEl.textContent = `🏠 住所: ${spot.address}`;
        addressEl.style.display = "block";
    } else {
        addressEl.style.display = "none";
    }

    setText("description", spot.description || "");

    // Googleマップ
    const searchTarget = spot.address || spot.name;
    const encodedQuery = encodeURIComponent(searchTarget);

    const mapIframe = document.getElementById("google-map");
    if (mapIframe) {
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
});


// --- 口コミ管理機能（カテゴリ共通） ---
function initReviews(spotName, jsonReviews) {
    const storageKey = `comments_${spotName}`;
    const form = document.getElementById("comment-form");
    const commentsList = document.getElementById("comments-list");
    const avgRatingEl = document.getElementById("average-rating");
    const countTextEl = document.getElementById("review-count");

    function renderReviews() {
        const localReviews = JSON.parse(localStorage.getItem(storageKey)) || [];

        const allReviews = [
            ...(Array.isArray(jsonReviews) ? jsonReviews.map(r => ({
                name: r.author || r.name || "匿名",
                score: parseInt(r.score || r.rating) || 5,
                comment: r.comment || r.text || "",
                date: "投稿済み",
            })) : []),
            ...localReviews,
        ];

        if (!commentsList) return;
        commentsList.innerHTML = "";

        if (allReviews.length === 0) {
            commentsList.innerHTML = "<p style='color:#888;'>まだ口コミはありません。</p>";
            if (avgRatingEl) avgRatingEl.textContent = "⭐ 0.0";
            if (countTextEl) countTextEl.textContent = "(0件の口コミ)";
            return;
        }

        const totalScore = allReviews.reduce((sum, r) => sum + r.score, 0);
        const avgScore = (totalScore / allReviews.length).toFixed(1);

        if (avgRatingEl) avgRatingEl.textContent = `⭐ ${avgScore}`;
        if (countTextEl) countTextEl.textContent = `(${allReviews.length}件の口コミ)`;

        [...allReviews].reverse().forEach(r => {
            const stars = "★".repeat(r.score) + "☆".repeat(Math.max(0, 5 - r.score));
            commentsList.innerHTML += `
                <div class="comment-card">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHTML(r.name)}</span>
                        <span class="comment-score">${stars}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(r.comment)}</p>
                    ${r.date ? `<div class="comment-date">${escapeHTML(r.date)}</div>` : ""}
                </div>
            `;
        });
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

    renderReviews();
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
