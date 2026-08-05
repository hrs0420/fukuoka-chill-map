const params = new URLSearchParams(window.location.search);

const saunaName = params.get("name");

fetch("data/saunas.json")
    .then(response => response.json())
    .then(saunas => {

        const sauna = saunas.find(s =>
            s.name === saunaName
        );

        if (!sauna) {
            alert("サウナ情報が見つかりません。");
            return;
        }

        document.getElementById("title").textContent =
            sauna.name;

        document.getElementById("area").textContent =
            "📍 " + sauna.area;

        document.getElementById("rating").textContent =
            "⭐ " + sauna.rating;

        document.getElementById("onsen").textContent =
            sauna.onsen ? "♨温浴あり" : "♨温浴なし";

        document.getElementById("loyly").textContent =
            sauna.loyly ? "🔥 ロウリュあり" : "🔥 ロウリュなし";

        document.getElementById("stay").textContent =
            sauna.stay ? "🏩 宿泊可能" : "🏩 宿泊不可";

        document.getElementById("parking").textContent =
            sauna.parking ? "🚗 駐車場あり" : "🚗 駐車場なし";

        document.getElementById("hours").textContent =
            "🕙 営業時間：" + sauna.hours;

        document.getElementById("address").textContent =
            "📍 住所：" + sauna.address;

        document.getElementById("description").textContent =
            sauna.description;
    });