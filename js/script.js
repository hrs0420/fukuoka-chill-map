const searchInput = document.getElementById("search");

fetch("data/cafes.json")
    .then(response => response.json())
    .then(cafes => {

        const list = document.getElementById("cafe-list");

        cafes.forEach(cafe => {

            list.innerHTML +=`
                <div class="card">
                    <h2>${cafe.name}</h2>
                    <p>📍 ${cafe.area}</p>
                    <p>⭐ ${cafe.rating}</p>
                    <p>${cafe.description}</p>
                </div>
           `;
        });
    });