// 要素取得
const searchInput = document.getElementById("search");
const lightCheck = document.getElementById("lighted");
const lockerCheck = document.getElementById("locker");
const bathroomCheck = document.getElementById("bathroom");
const areaSelect = document.getElementById("area");
const list = document.getElementById("running-list");

let runningSpots = [];

// 初期化
async function init() {
    runningSpots = await loadData("running.json");
    displaySpots(runningSpots);

    // イベントリスナーの登録
    searchInput.addEventListener("input", filterSpots);
    lightCheck.addEventListener("change", filterSpots);
    lockerCheck.addEventListener("change", filterSpots);
    bathroomCheck.addEventListener("change", filterSpots);
    areaSelect.addEventListener("change", filterSpots);

    // ハートマーク（いいね）のクリックイベント処理
    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("favorite")) {
            e.preventDefault(); // リンク遷移を防ぐ
            
            const spotName = e.target.dataset.name;
            let favorites = JSON.parse(localStorage.getItem("runningFavorites")) || [];

            if (favorites.includes(spotName)) {
                // すでに登録されていれば削除
                favorites = favorites.filter(name => name !== spotName);
            } else {
                // 登録されていなければ追加
                favorites.push(spotName);
            }

            // ローカルストレージに保存
            localStorage.setItem("runningFavorites", JSON.stringify(favorites));

            // 表示を再更新
            filterSpots();
        }
    });
}

// ランニングスポット一覧を表示する関数
function displaySpots(data) {
    list.innerHTML = "";
    const favorites = JSON.parse(localStorage.getItem("runningFavorites")) || [];

    if (data.length === 0) {
        list.innerHTML = "<p>該当するランニングスポットが見つかりませんでした。</p>";
        return;
    }

    data.forEach(spot => {
        // タグの生成（距離・路面・各設備）
        const tags = [
            `🏃 1周: ${spot.distance}`,
            `🛣 ${spot.surface}`,
            spot.lighted ? "💡 ナイター" : "",
            spot.locker ? "🎒 ロッカー" : "",
            spot.bathroom ? "🚽 トイレ" : ""
        ].filter(Boolean).join(" | ");

        list.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(spot.name)}" class="card-link">
            <div class="card">
                <img src="${spot.image}" alt="${spot.name}" class="cafe-image">
                <h2>
                    ${spot.name}
                    <span 
                        class="favorite" 
                        data-name="${spot.name}">
                        ${favorites.includes(spot.name) ? "❤️" : "🤍"}
                    </span>
                </h2>
                <p>📍 ${spot.area}</p>
                <p>⭐ ${spot.rating}</p>
                <p><small style="color: #666;">${tags}</small></p>
                <p>${spot.description}</p>
            </div>
        </a>
        `;
    });
}

// フィルター処理
function filterSpots() {
    const keyword = searchInput.value.toLowerCase();

    const filtered = runningSpots.filter(spot => {
        const matchKeyword = 
            spot.name.toLowerCase().includes(keyword) ||
            spot.description.toLowerCase().includes(keyword) ||
            spot.surface.toLowerCase().includes(keyword);
        
        // チェックボックス判定
        const matchLighted = !lightCheck.checked || spot.lighted;
        const matchLocker = !lockerCheck.checked || spot.locker;
        const matchBathroom = !bathroomCheck.checked || spot.bathroom; 
        
        // エリア判定
        const matchArea = areaSelect.value === "" || spot.area === areaSelect.value;
        
        return matchKeyword && matchLighted && matchLocker && matchBathroom && matchArea;                        
    });
    
    displaySpots(filtered);
}

init();