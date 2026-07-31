const params = new URLSearchParams(window.location.search)

const cafeName = params.get("name");

fetch("data/cafes.json")
    .then(response => response.json())
    .then(cafes => {

        const cafe = cafes.find(c =>
            c.name === cafeName
        );

        if (!cafe) {
            alert("カフェ情報が見つかりません。");
            return;
        }

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

        document.getElementById("parking").textContent =
            cafe.parking ? "🚗駐車場あり" : "🚗駐車場なし"; 

        document.getElementById("hours").textContent =
            "🕙営業時間 " + cafe.hours;

        document.getElementById("address").textContent =
            "📍 住所 " + cafe.address;
    });