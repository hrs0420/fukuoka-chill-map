document.addEventListener("DOMContentLoaded", async () => {
    // 1. URLパラメータからスポット名を取得
    const urlParams = new URLSearchParams(window.location.search);
    const rawSpotName = urlParams.get("name");

    if (!rawSpotName) {
        alert("スポット情報が見つかりません。");
        window.location.href = "index.html";
        return;
    }

    const cleanSpotName = decodeURIComponent(rawSpotName).trim();

    // 2. すべてのJSONデータ（カフェ、サウナ、ランニング）を読み込み
    let allSpots = [];
    try {
        const [cafesRes, saunasRes, runningRes] = await Promise.all([
            fetch("data/cafes.json").catch(() => null),
            fetch("data/saunas.json").catch(() => null),
            fetch("data/running.json").catch(() => null)
        ]);

        if (cafesRes && cafesRes.ok) {
            const cafes = await cafesRes.json();
            allSpots.push(...cafes);
        }
        if (saunasRes && saunasRes.ok) {
            const saunas = await saunasRes.json();
            allSpots.push(...saunas);
        }
        if (runningRes && runningRes.ok) {
            const running = await runningRes.json();
            allSpots.push(...running);
        }
    } catch (error) {
        console.error("データ読み込みエラー:", error);
    }

    // 3. 名前が一致するスポットを検索
    const spot = allSpots.find(s => s && s.name && s.name.trim() === cleanSpotName) || { name: cleanSpotName };

    // 4. テキスト表示用ヘルパー関数
    const setElementText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = text;
            el.style.display = "block";
        }
    };

    // 真偽値（true / false）や文字列を「あり / なし / テキスト」に変換する関数
    const formatBool = (val) => {
        if (val === true || val === "true" || val === "あり") return "あり";
        if (val === false || val === "false" || val === "なし") return "なし";
        return val || "なし";
    };

    // 5. 画面上の各要素へデータをセット
    setElementText("title", spot.name || cleanSpotName);
    setElementText("spot-name", spot.name || cleanSpotName);
    setElementText("area", `📍 エリア: ${spot.area || spot.location || '情報なし'}`);
    setElementText("rating", `⭐ 評価: ${spot.rating || spot.score || '0.0'}`);

    // Wi-Fi / 電源
    setElementText("wifi", `📶 Wi-Fi: ${formatBool(spot.wifi)}`);
    setElementText("outlet", `🔌 電源: ${formatBool(spot.outlet || spot.power)}`);

    // その他の詳細項目
    setElementText("parking", `🅿️ 駐車場: ${spot.parking || '情報なし'}`);
    setElementText("hours", `🕒 営業時間: ${spot.hours || spot.businessHours || spot.openHours || '情報なし'}`);
    setElementText("closed", `🗓️ 定休日: ${spot.closed || spot.regularHoliday || spot.holiday || '情報なし'}`);
    setElementText("payment", `💳 決済方法: ${spot.payment || spot.pay || '情報なし'}`);
    setElementText("address", `🏠 住所: ${spot.address || spot.access || '情報なし'}`);
    setElementText("description", spot.description || spot.detail || spot.memo || '');

    // 6. Google Map の表示処理
    const searchTarget = spot.address || spot.name || cleanSpotName;
    const encodedQuery = encodeURIComponent(searchTarget);

    const mapIframe = document.getElementById("google-map");
    if (mapIframe) {
        mapIframe.src = `https://maps.google.com/maps?q=${encodedQuery}&output=embed&z=15`;
    }

    const mapLink = document.getElementById("mapLink");
    if (mapLink) {
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
    }

    // 7. 口コミ機能の初期化
    initReviews(spot.name || cleanSpotName, spot.reviews || []);
});


// --- 口コミ管理機能 ---
function initReviews(spotName, jsonReviews) {
    const storageKey = `comments_${spotName}`;
    const form = document.getElementById("comment-form");
    const commentsList = document.getElementById("comments-list");
    const avgRatingEl = document.getElementById("average-rating");
    const countTextEl = document.getElementById("review-count");

    function renderReviews() {
        const localReviews = JSON.parse(localStorage.getItem(storageKey)) || [];

        const allReviews = [
            ...jsonReviews.map(r => ({
                name: r.author || r.name || '匿名',
                score: parseInt(r.score || r.rating) || 5,
                comment: r.comment || r.text || '',
                date: '投稿済み'
            })),
            ...localReviews
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
                    ${r.date ? `<div class="comment-date">${escapeHTML(r.date)}</div>` : ''}
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
                date: new Date().toLocaleDateString("ja-JP")
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

// 修正済み escapeHTML（構文エラーなし）
function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}