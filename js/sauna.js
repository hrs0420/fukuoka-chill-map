// 要素取得
const searchInput = document.getElementById("search");
const onsenCheck = document.getElementById("onsen");
const loylyCheck = document.getElementById("loyly");
const stayCheck = document.getElementById("stay"); // hotel から stay に修正
const parkingCheck = document.getElementById("parking");
const areaSelect = document.getElementById("area");
const saunaList = document.getElementById("sauna-list");

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
}

// フィルター処理
function filterSaunas() {
    const keyword = searchInput.value.toLowerCase();

    const filtered = saunas.filter(sauna => {
        const matchKeyword = sauna.name.toLowerCase().includes(keyword) || 
                             sauna.description.toLowerCase().includes(keyword);
        
        const matchOnsen = !onsenCheck.checked || sauna.onsen;
        const matchLoyly = !loylyCheck.checked || sauna.loyly;
        const matchStay = !stayCheck.checked || sauna.stay; // hotel から stay に修正
        const matchParking = !parkingCheck.checked || sauna.parking;
        
        const matchArea = areaSelect.value === "" || sauna.area === areaSelect.value;

        return matchKeyword && matchOnsen && matchLoyly && matchStay && matchParking && matchArea;
    });

    displaySaunas(filtered);
}

// カード一覧表示処理
function displaySaunas(data) {
    saunaList.innerHTML = "";

    if (data.length === 0) {
        saunaList.innerHTML = "<p>該当するサウナが見つかりませんでした。</p>";
        return;
    }

    data.forEach(sauna => {

        const tags = [
            sauna.onsen ? "♨️ 温泉" : "",
            sauna.loyly ? "🔥 ロウリュ" : "",
            sauna.stay ? "🏨 宿泊" : "",
            sauna.parking ? "🚗 駐車場" : ""
        ].filter(Boolean).join(" | ");

        saunaList.innerHTML += `
        <a href="sauna-detail.html?name=${encodeURIComponent(sauna.name)}" class="card-link">
            <div class="card">
                <img src="${sauna.image}" alt="${sauna.name}" class="cafe-image">

                <h3>${sauna.name}</h3>

                <p>⭐ ${sauna.rating} (${sauna.area})</p>

                <p><small>${tags}</small></p>

                <p>${sauna.description}</p>
            </div>
        </a>
        `;
    });
}
init();