// js/sauna-detail.js

async function initDetail() {
    // 1. URLから "name" または "id" パラメータを取得
    const params = new URLSearchParams(window.location.search);
    const saunaName = params.get("name") || params.get("id");

    if (!saunaName) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>指定されたサウナが見つかりません。</h2><p style='text-align:center;'><a href='saunas.html'>一覧に戻る</a></p>";
        return;
    }

    // 2. saunas.json を取得
    const saunas = await loadData("saunas.json");

    // 3. クリックされたサウナ名（またはID）と一致するデータを取得
    const sauna = saunas.find(item => item.name === saunaName || item.id == saunaName);

    if (!sauna) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>サウナ情報が見つかりませんでした。</h2><p style='text-align:center;'><a href='saunas.html'>一覧に戻る</a></p>";
        return;
    }

    // 4. HTMLに各情報を反映
    if (document.getElementById("title")) document.getElementById("title").textContent = sauna.name;
    if (document.getElementById("area")) document.getElementById("area").textContent = `エリア: ${sauna.area}`;
    if (document.getElementById("rating")) document.getElementById("rating").textContent = `評価: ⭐ ${sauna.rating}`;
    if (document.getElementById("onsen")) document.getElementById("onsen").textContent = `温泉: ${sauna.onsen ? "あり" : "なし"}`;
    if (document.getElementById("loyly")) document.getElementById("loyly").textContent = `ロウリュ: ${sauna.loyly ? "あり" : "なし"}`;
    if (document.getElementById("stay")) document.getElementById("stay").textContent = `宿泊: ${(sauna.stay || sauna.hotel) ? "可能" : "不可"}`;
    if (document.getElementById("parking")) document.getElementById("parking").textContent = `駐車場: ${sauna.parking ? "あり" : "なし"}`;
    if (document.getElementById("hours")) document.getElementById("hours").textContent = `営業時間: ${sauna.hours}`;
    if (document.getElementById("address")) document.getElementById("address").textContent = `住所: ${sauna.address || "情報なし"}`;
    if (document.getElementById("description")) document.getElementById("description").textContent = sauna.description;

    // 5. Googleマップリンク設定
    const mapLink = document.getElementById("mapLink");
    if (mapLink) {
        if (sauna.map) {
            mapLink.href = sauna.map;
            mapLink.style.display = "inline-block";
        } else {
            mapLink.style.display = "none";
        }
    }
    // 6. サウナイキタイのリンク設定
    const ikitaiLink = document.getElementById("ikitaiLink");
    if (ikitaiLink) {
        if (sauna.ikitai) {
            ikitaiLink.href = sauna.ikitai;
            ikitaiLink.style.display = "inline-block";
        } else {
            ikitaiLink.style.display = "none";
        }
    }
}

initDetail();