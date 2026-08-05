const searchInput = document.getElementById("search");
const lightCheck = document.getElementById("lighted");
const lockerCheck = document.getElementById("locker");
const bathroomCheck = document.getElementById("bathroom");
const areaSelect = document.getElementById("area");
const runningList = document.getElementById("running-list");

let runningSpots = [];

//初期化
async function init() {
    runningSpots = await loadData("running.json");
    displaySpots(runningSpots);

    //イベントリスナーの登録

    searchInput.addEventListener("input", filterSpots);
    lightCheck.addEventListener("change", filterSpots);
    lockerCheck.addEventListener("change", filterSpots);
    bathroomCheck.addEventListener("change", filterSpots);
    areaSelect.addEventListener("change", filterSpots);
}

//フィルター処理
function filterSpots() {
    const keyword = searchInput.toLowerCase();

    const filtered = runningSpots.filter(spot => {

        const matchKeyword = spot.name.toLowerCase().includes(keyword) ||
                             spot.description.toLowerCase().includes(keyword) ||
                             spot.surface.toLowerCase().includes(keyword);
        
            
        //チェックボックス判定
        const matchLighted = !lightedCheck.checked || spot.lighted;
        const matchLocker = !lockerCheck.checked || spot.locker;
        const matchBathroom = !bathroomCheck.checked || spot.bathroom; 
        
        //エリア判定
        const matchArea = areaSelect.value === "" || spot.area === areaSelect.value;
        
        return matchKeyword && matchLighted && matchLocker && matchBathroom && matchArea;                        
    });
    
    displaySpots(filtered);
}

// カード一覧表示処理
function displaySpots(data) {
    runningList.innerHTML = "";

    if (data.length === 0) {
        runningList.innerHTML = "<p>該当するランニングスポットが見つかりませんでした。</p>";
        return;
    }

    data.forEach(spot => {
        const card = document.createElement("div");
        card.className = "card";

        // タグの生成（距離・路面・各設備）
        const tags = [
            `🏃 1周: ${spot.distance}`,
            `🛣 ${spot.surface}`,
            spot.lighted ? "💡 ナイター": "",
            spot.locker ? "🎒 ロッカー": "",
            spot.bathroom ? "🚽 トイレ": ""
        ].filter(Boolean).join("|");

        card.innerHTML = `
            <img src="${spot.image}" alt="${spot.name}" style="width: 100%; height:180px; object-fit: cover; border-radius: 10px;">
            <h3>${spot.name}</h3>
            <p>⭐ ${spot.rating} (${spot.area})</p>
            <p><small style="color: #666;">${tags}</small></p>
            <p>${spot.description}</p>
        `;

        runningList.appendChild(card);
    });
}

init();