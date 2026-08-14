/*
 * お気に入り一覧ページ。
 * list.js と同じ categories.js の設定（CATEGORY_CONFIG）を再利用することで、
 * データファイル名・お気に入りキー名などの二重管理をなくしている。
 */

document.addEventListener("DOMContentLoaded", init);

async function init() {
    // CATEGORY_CONFIG に定義された cafe / sauna / running を順番に処理
    for (const [categoryKey, categoryConfig] of Object.entries(CATEGORY_CONFIG)) {
        const container = document.getElementById(`favorite-${categoryKey}`);
        if (!container) continue; // このページに該当セクションが無ければスキップ

        try {
            const allData = await loadData(categoryConfig.dataFile);
            const favoriteNames = JSON.parse(localStorage.getItem(categoryConfig.storageKey)) || [];
            renderFavorites(container, allData, favoriteNames, categoryConfig);
        } catch (error) {
            console.error(`${categoryKey} の読み込みに失敗しました:`, error);
            container.innerHTML = "<p style='color: #888;'>データを読み込めませんでした。</p>";
        }
    }
}

function renderFavorites(container, allData, favoriteNames, categoryConfig) {
    container.innerHTML = "";

    const filteredData = allData.filter(item => favoriteNames.includes(item.name));

    if (filteredData.length === 0) {
        container.innerHTML = "<p style='color: #888;'>お気に入りはまだありません。</p>";
        return;
    }

    filteredData.forEach(item => {
        container.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(item.name)}&type=${categoryConfig.type}" class="card-link">
            <div class="card">
                <img src="${item.image}" alt="${item.name}" class="cafe-image">
                <h2>
                    ${item.name}
                    <span 
                        class="favorite" 
                        data-name="${item.name}"
                        data-key="${categoryConfig.storageKey}">
                        ❤️
                    </span>
                </h2>
                <p>📍 ${item.area}</p>
                <p>⭐ ${item.rating}</p>
                <p>${item.description}</p>
            </div>
        </a>
        `;
    });
}

// お気に入り解除のクリックイベント
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("favorite")) return;
    e.preventDefault();

    const name = e.target.dataset.name;
    const storageKey = e.target.dataset.key;

    let favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
    favorites = favorites.filter(favName => favName !== name);
    localStorage.setItem(storageKey, JSON.stringify(favorites));

    // 画面を再読み込みしてお気に入りを更新
    init();
});
