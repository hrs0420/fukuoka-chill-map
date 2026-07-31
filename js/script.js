const searchInput = document.getElementById("search");
const list = document.getElementById("cafe-list");

const wifiCheck = document.getElementById("wifi");
const outletCheck = document.getElementById("outlet");


let cafes = [];


//JSONを読み込む
fetch("data/cafes.json")
    .then(response => response.json())
    .then(data =>{
        cafes = data;
        displayCafes(cafes);
    });

//検索機能
searchInput.addEventListener("input", () =>{

    const keyword = searchInput.value.toLowerCase();

    const filtered = cafes.filter(cafe =>
        cafe.name.toLowerCase().includes(keyword)
    );

    displayCafes(filtered);

});