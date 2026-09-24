// --- バックエンドAPIの設定 ---
// 空文字のあいだはバックエンドを一切呼ばない（GitHub Pagesでの公開中はこの状態にしておく）。
// 将来バックエンドを本番公開したら、そのURL（https://...）を入れる。
const API_BASE_URL = "";

// 承認済みの投稿スポットを取得する（バックエンド未設定・未接続時は空配列を返す）
async function fetchApprovedSpots(category) {
    if (!API_BASE_URL) return [];
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${API_BASE_URL}/api/spots?category=${category}`, {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.warn("承認済みスポットの取得に失敗しました:", err);
        return [];
    }
}

// 既存の静的JSON + 承認済み投稿データを合体して返す
async function getCombinedSpots(categoryConfig) {
    const [staticData, approvedData] = await Promise.all([
        loadData(categoryConfig.dataFile),
        fetchApprovedSpots(categoryConfig.type),
    ]);
    return [...staticData, ...approvedData];
}

async function loadData(fileName) {
    const response = await fetch(`data/${fileName}`);
    return await response.json();
}

// HTMLエスケープ（全ページ共通）。innerHTML に外部データを入れるときは必ず通す。
function escapeHTML(value) {
    if (value === undefined || value === null) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- ハンバーガーメニューの開閉処理 ---
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();

    const hamburger = document.getElementById("hamburger-btn");
    const navMenu = document.getElementById("nav-menu");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });
    }
});
