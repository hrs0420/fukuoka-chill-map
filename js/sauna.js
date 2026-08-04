const searchInput = document.getElementById("search");
const list = document.getElementById("cafe-list");

let saunas = [];

// JSONを読み込む
async function init() {
    saunas = await loadData("saunas.json");

    displaySaunas(saunas);
}

init();

searchInput.addEventListener("input", filterSaunas);

// サウナ一覧を表示
function displaySaunas(saunaData) {

    list.innerHTML = "";

    saunaData.forEach(sauna => {

        list.innerHTML += `
        <a href="#" class="card-link">

            <div class="card">

                <img src="${sauna.image}" alt="${sauna.name}" class="cafe-image">

                <h2>${sauna.name}</h2>

                <p>📍 ${sauna.area}</p>

                <p>⭐ ${sauna.rating}</p>

                <p>${sauna.description}</p>

            </div>

        </a>
        `;

    });

}

//サウナを検索
function filterSaunas() {

    const keyword = searchInput.ariaValueMax.toLowerCase();

    const filtered = saunas.filter(sauna => {

        return sauna.name.toLowerCase().includes(keyword);

    });
}