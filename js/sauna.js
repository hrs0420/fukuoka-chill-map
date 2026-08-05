// 要素取得
const searchInput = document.getElementById("search");
const onsenCheck = document.getElementById("onsen");
const loylyCheck = document.getElementById("loyly");
const hotelCheck = document.getElementById("hotel");
const parkingCheck = document.getElementById("parking");
const areaSelect = document.getElementById("area");
const saunaList = document.getElementById("sauna-list");

let saunas = [];

// 初期化
async function init() {
    saunas = await loadData("saunas.json");
    displaySaunas(saunas);

    // イベントリスナーの登録
    if (searchInput) searchInput.addEventListener("input", filterSaunas);
    if (onsenCheck) onsenCheck.addEventListener("change", filterSaunas);
    if (loylyCheck) loylyCheck.addEventListener("change", filterSaunas);
    if (hotelCheck) hotelCheck.addEventListener("change", filterSaunas);
    if (parkingCheck) parkingCheck.addEventListener("change", filterSaunas);
    if (areaSelect) areaSelect.addEventListener("change", filterSaunas);
}

// フィルター処理
function filterSaunas() {
    const keyword = searchInput ? searchInput.value.toLowerCase() : "";

    const filtered = saunas.filter(sauna => {
        const matchKeyword = sauna.name.toLowerCase().includes(keyword) || 
                             sauna.description.toLowerCase().includes(keyword);
        
        const matchOnsen = !onsenCheck || !onsenCheck.checked || sauna.onsen;
        const matchLoyly = !loylyCheck || !loylyCheck.checked || sauna.loyly;
        const matchHotel = !hotelCheck || !hotelCheck.checked || sauna.stay || sauna.hotel;
        const matchParking = !parkingCheck || !parkingCheck.checked || sauna.parking;
        const matchArea = !areaSelect || areaSelect.value === "" || sauna.area === areaSelect.value;

        return matchKeyword && matchOnsen && matchLoyly && matchHotel && matchParking && matchArea;
    });

    displaySaunas(filtered);
}

// サウナ一覧表示処理
// sauna.js の表示処理部分
function displaySaunas(saunaData) {
    if (!saunaList) return;
    saunaList.innerHTML = "";

    if (saunaData.length === 0) {
        saunaList.innerHTML = "<p>該当するサウナが見つかりませんでした。</p>";
        return;
    }

    saunaData.forEach(sauna => {
        const card = document.createElement("div");
        card.className = "card";

        const tags = [
            sauna.onsen ? "♨️ 温泉" : "",
            sauna.loyly ? "🔥 ロウリュ" : "",
            (sauna.stay || sauna.hotel) ? "🏨 宿泊" : "",
            sauna.parking ? "🚗 駐車場" : ""
        ].filter(Boolean).join(" | ");

        // ✨ encodeURIComponent(sauna.name) で個別の店名をURLに持たせます
        card.innerHTML = `
            <a href="sauna-detail.html?name=${encodeURIComponent(sauna.name)}" style="text-decoration: none; color: inherit; display: block;">
                <img src="${sauna.image}" alt="${sauna.name}" class="cafe-image">
                <h3>${sauna.name}</h3>
                <p>⭐ ${sauna.rating} (${sauna.area})</p>
                <p><small style="color: #666;">${tags}</small></p>
                <p>${sauna.description}</p>
            </a>
        `;

        saunaList.appendChild(card);
    });
}
init();