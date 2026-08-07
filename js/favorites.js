const cafeList = document.getElementById("favorite-cafes");
const saunaList = document.getElementById("favorite-saunas");
const runningList = document.getElementById("favorite-running");

async function init() {
    //全データの読み込み
    const cafes = await loadData("cafes.json");
    const saunas = await loadData("saunas.json");
    const runningSpots = await loadData("running.json");

    //ローカルストレージからお気に入りリストを取得
    const favCafes = JSON.parse(localStorage.getItem("favorites")) || [];
    const favSaunas = JSON.parse(localStorage.getItem("saunaFavorites")) || [];
    const favRunning = JSON.parse(localStorage.getItem("runningFavorites")) || [];

    //フィルタリングして表示
    displayFavorites(cafeList, cafes, favCafes, "cafes");
    displayFavorites(saunaList, saunas, favSaunas, "saunaFavorites");
    displayFavorites(runningList, runningSpots, favRunning, "runningFavorites");

    //解除ボタンのクリックイベント
    document.addEventListener("click", (e) => {
        if(e.target.classList.contains("favorite")) {
            e.preventDefault();
            const name = e.target.dataset.name;
            const storageKey = e.target.dataset.key;
            
            let favorites = JSON.parse(localStorage.getItem(storageKey)) || [];
            favorites = favorites.filter(favName => favName !== name);
            localStorage.setItem(storageKey, JSON.stringify(favorites));

            // 画面を再読み込みしてお気に入りを更新する
            init();
        }
    });

} 

// お気に入りカードを描画する汎用関数
function displayFavorites(container, allData, favoriteNames, storageKey) {
    container.innerHTML = "";

    // いいねされているデータだけを抽出
    const filterData = allData.filter(item => favoriteNames.includes(item.name));

    if (filterData.length === 0) {
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

init();