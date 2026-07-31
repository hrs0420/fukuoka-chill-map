const searchInput = document.getElementById("search");
const list = document.getElementById("cafe-list");

const wifiCheck = document.getElementById("wifi");
const outletCheck = document.getElementById("outlet");
const areaSelect = document.getElementById("area");

let cafes = [];


//JSONを読み込む
async function init() {
    cafes = await loadData("cafes.json");

    displayCafes(cafes);
}

init();


//検索機能
searchInput.addEventListener("input", filterCafes);
wifiCheck.addEventListener("change", filterCafes);
outletCheck.addEventListener("change", filterCafes);
areaSelect.addEventListener("change", filterCafes);

//いいね機能
document.addEventListener("click",(e)=>{

    if(!e.target.classList.contains("favorite")){
        return;
    }


    e.preventDefault();
    e.stopPropagation();

    const name=e.target.dataset.name;

    let favorites=
        JSON.parse(localStorage.getItem("favorites"))||[]

        if(favorites.includes(name)){
            favorites=
            favorites.filter(f=>f!==name);

            e.target.textContent="🤍";

        }else{

            favorites.push(name);

            e.target.textContent="❤️";
        }

        localStorage.setItem(
            "favorites",
            JSON.stringify(favorites)
        );
        filterCafes();
});