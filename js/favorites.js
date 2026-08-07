// 各表示エリアの要素取得
const cafeList = document.getElementById("favorite-cafes");
const saunaList = document.getElementById("favorite-saunas");
const runningList = document.getElementById("favorite-running");

async function init() {
    try {
        // 全データの読み込み
        const cafes = await loadData("cafes.json");
        const saunas = await loadData("saunas.json");
        const runningSpots = await loadData("running.json");

        // ローカルストレージからお気に入りリストを取得
        const favCafes = JSON.parse(localStorage.getItem("favorites")) || [];
        const favSaunas = JSON.parse(localStorage.getItem("saunaFavorites")) || [];
        const favRunning = JSON.parse(localStorage.getItem("runningFavorites")) || [];

        // フィルタリングして表示
        displayFavorites(cafeList, cafes, favCafes, "favorites");
        displayFavorites(saunaList, saunas, favSaunas, "saunaFavorites");
        displayFavorites(runningList, runningSpots, favRunning, "runningFavorites");
    } catch (error) {
        console.error("データの読み込みに失敗しました:", error);
    }
}

// お気に入り解除のクリックイベント
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("favorite")) {
        e.preventDefault();
        const name = e.target.dataset.name;
        const storageKey = e.target.dataset.key;

        let favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
        favorites = favorites.filter(favName => favName !== name);
        localStorage.setItem(storageKey, JSON.stringify(favorites));

        // 画面を再読み込みしてお気に入りを更新
        init();
    }
});

// お気に入りカードを描画する関数
function displayFavorites(container, allData, favoriteNames, storageKey) {
    if (!container) return;
    
    container.innerHTML = "";

    // データが存在しない場合のガード処理
    if (!allData || !Array.isArray(allData)) {
        container.innerHTML = "<p style='color: #888;'>データを読み込めませんでした。</p>";
        return;
    }

    // いいねされているデータだけを抽出
    const filteredData = allData.filter(item => favoriteNames.includes(item.name));

    if (filteredData.length === 0) {
        container.innerHTML = "<p style='color: #888;'>お気に入りはまだありません。</p>";
        return;
    }

    filteredData.forEach(item => {
        container.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(item.name)}" class="card-link">
            <div class="card">
                <img src="${item.image}" alt="${item.name}" class="cafe-image">
                <h2>
                    ${item.name}
                    <span 
                        class="favorite" 
                        data-name="${item.name}"
                        data-key="${storageKey}">
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

// 初期化実行
init();