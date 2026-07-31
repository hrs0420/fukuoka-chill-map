const searchInput = document.getElementById("search");
const list = document.getElementById("cafe-list");


let cafes = [];


//カフェ一覧を表示する関数
function displayCafes(cafeData) {
    list.innerHTML = "";

    cafeData.forEach(cafe => {
        list.innerHTML +=
            <div class="cards">
                <h2>${cafe.name}</h2>
                <p>📍 ${cafe.area}</p>
                <p>⭐ ${cafe.rating}</p>
                <p>${cafe.description}</p>
            </div>
        ;
    });
}

//JSONを読み込む
fetch("data/cafes.json")
    .then(response => response.json())
    .then(data =>{
        cafes = data;
        displayCafes(cafes);
    });

//検索機能
searchInput.addEventListener("input", () =>{

    const keyword = searchInput.ariaValueMax.toLowerCase();

    const filtered = cafes.filter(cafe =>
        cafe.name.toLowerCase().includes(keyword)
    );

    displayCafes(filtered);

});