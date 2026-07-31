//カフェ一覧を表示する関数
function displayCafes(cafeData) {
    list.innerHTML = "";
    const favorites=
    JSON.parse(localStorage.getItem("favorites"))||[]

    cafeData.forEach(cafe => {
        list.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(cafe.name)}" class="card-link">
            <div class="card">
                <img src="${cafe.image}" alt="${cafe.name}" class="cafe-image">
                <h2>
                ${cafe.name}
                    <span
                        class="favorite"
                        data-name="${cafe.name}">
                        ${favorites.includes(cafe.name) ? "❤️" : "🤍"}
                    </span>
                </h2>
                <p>📍 ${cafe.area}</p>
                <p>⭐ ${cafe.rating}</p>
                <p>${cafe.description}</p>
            </div>
        </a>
        `;
    });
}

//フィルターにかける
function filterCafes() {

    const keyword = searchInput.value.toLowerCase();

    const filtered = cafes.filter(cafe => {

        const matchKeyword =
            cafe.name.toLowerCase().includes(keyword);

        const matchWifi =
            !wifiCheck.checked || cafe.wifi;

        const matchOutlet =
            !outletCheck.checked || cafe.outlet;
        
        const matchArea =
            areaSelect.value === "" ||
            cafe.area === areaSelect.value;

        return matchKeyword &&
            matchWifi &&
            matchOutlet&&
            matchArea;

    });

    displayCafes(filtered);

}