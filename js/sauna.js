// 要素取得
const searchInput = document.getElementById("search");
const onsenCheck = document.getElementById("onsen");
const loylyCheck = document.getElementById("loyly");
const stayCheck = document.getElementById("stay");
const parkingCheck = document.getElementById("parking");
const areaSelect = document.getElementById("area");
const list = document.getElementById("sauna-list");

let saunas = [];

// 初期化（utils.js の loadData を使用）
async function init() {
    saunas = await loadData("saunas.json");
    displaySaunas(saunas);

    // 変更時にフィルターを発動
    searchInput.addEventListener("input", filterSaunas);
    onsenCheck.addEventListener("change", filterSaunas);
    loylyCheck.addEventListener("change", filterSaunas);
    stayCheck.addEventListener("change", filterSaunas);
    parkingCheck.addEventListener("change", filterSaunas);
    areaSelect.addEventListener("change", filterSaunas);

    // ハートマーク（いいね）のクリックイベント処理
    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("favorite")) {
            e.preventDefault(); // リンク遷移を防ぐ
            
            const saunaName = e.target.dataset.name;
            let favorites = JSON.parse(localStorage.getItem("saunaFavorites")) || [];

            if (favorites.includes(saunaName)) {
                // すでに登録されていれば削除
                favorites = favorites.filter(name => name !== saunaName);
            } else {
                // 登録されていなければ追加
                favorites.push(saunaName);
            }

            // ローカルストレージに保存
            localStorage.setItem("saunaFavorites", JSON.stringify(favorites));

            // 表示を再更新
            filterSaunas();
        }
    });
}

// サウナ一覧を表示する関数
function displaySaunas(saunaData) {
    list.innerHTML = "";
    const favorites = JSON.parse(localStorage.getItem("saunaFavorites")) || [];

    if (saunaData.length === 0) {
        list.innerHTML = "<p>該当するサウナが見つかりませんでした。</p>";
        return;
    }

    saunaData.forEach(sauna => {
        list.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(sauna.name)}" class="card-link">
            <div class="card">
                <img src="${sauna.image}" alt="${sauna.name}" class="cafe-image">
                <h2>
                    ${sauna.name}
                    <span 
                        class="favorite" 
                        data-name="${sauna.name}">
                        ${favorites.includes(sauna.name) ? "❤️" : "🤍"}
                    </span>
                </h2>
                <p>📍 ${sauna.area}</p>
                <p>⭐ ${sauna.rating}</p>
                <p>${sauna.description}</p>
            </div>
        </a>
        `;
    });
}

// フィルターにかける
function filterSaunas() {
    const keyword = searchInput.value.toLowerCase();

    const filtered = saunas.filter(sauna => {
        const matchKeyword =
            sauna.name.toLowerCase().includes(keyword);

        const matchOnsen =
            !onsenCheck.checked || sauna.onsen;

        const matchLoyly =
            !loylyCheck.checked || sauna.loyly;

        const matchStay =
            !stayCheck.checked || sauna.stay;

        const matchParking =
            !parkingCheck.checked || sauna.parking;

        const matchArea =
            areaSelect.value === "" ||
            sauna.area === areaSelect.value;

        return matchKeyword &&
            matchOnsen &&
            matchLoyly &&
            matchStay &&
            matchParking &&
            matchArea;
    });

    displaySaunas(filtered);
}

init();