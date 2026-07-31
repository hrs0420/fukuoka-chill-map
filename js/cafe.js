//カフェ一覧を表示する関数
function displayCafes(cafeData) {
    list.innerHTML = "";

    cafeData.forEach(cafe => {
        list.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(cafe.name)}" class="card-link">
            <div class="card">
                <img src="${cafe.image}" alt="${cafe.name}" class="cafe-image">
                <h2>${cafe.name}</h2>
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
        
            return matchKeyword && matchWifi && matchOutlet;

    });

    displayCafes(filtered);

}