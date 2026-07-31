const params = newURLSearchParams(window.location.search)

const cafeName = params.get("name");

fetch("data/cafes.json")
    .then(response => response.json())
    .then(cafes => {

        const cafe = cafes.find(c =>
            c.name === cafeName
        );

        document.getElementById("title").textContent =
            cafe.name;

        document.getElementById("area").textContent =
            "📍 " + cafe.area;
        
        document.getElementById("rating").textContent =
            "⭐ " + cafe.rating;
        
        document.getElementById("description").textContent =
            cafe.description;
        
        document.getElementById("wifi").textContent =
            cafe.wifi ? "📶 Wi-Fiあり" : "📶 Wi-Fiなし";
        
        document.getElementById("outlet").textContent =
            cafe.outlet ? "🔌 コンセントあり" : "🔌 コンセントなし";        
    });