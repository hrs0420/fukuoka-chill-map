async function initDetail() {
    // 1. URLのパラメータからサウナの id を取得 (例: sauna-detail.html?id=1)
    const params = new URLSearchParams(window.location.search);
    const saunaId = params.get("id");

    // 2. JSON データを読み込む (utils.js の loadData を使用)
    const saunas = await loadData("saunas.json");

    // 3. id または name が一致するサウナを探す
    const sauna = saunas.find(item => item.id == saunaId || item.name === saunaId);

    // 該当するデータが見つからない場合の処理
    if (!sauna) {
        document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>サウナ情報が見つかりませんでした。</h2><p style='text-align:center;'><a href='saunas.html'>一覧に戻る</a></p>";
        return;
    }

    // 4. 画面にデータを反映する
    document.getElementById("title").textContent = sauna.name;
    document.getElementById("area").textContent = `エリア: ${sauna.area}`;
    document.getElementById("rating").textContent = `評価: ⭐ ${sauna.rating}`;
    document.getElementById("onsen").textContent = `温泉: ${sauna.onsen ? "あり" : "なし"}`;
    document.getElementById("loyly").textContent = `ロウリュ: ${sauna.loyly ? "あり" : "なし"}`;
    document.getElementById("stay").textContent = `宿泊: ${(sauna.stay || sauna.hotel) ? "可能" : "不可"}`;
    document.getElementById("parking").textContent = `駐車場: ${sauna.parking ? "あり" : "なし"}`;
    document.getElementById("hours").textContent = `営業時間: ${sauna.hours}`;
    document.getElementById("address").textContent = `住所: ${sauna.address}`;
    document.getElementById("description").textContent = sauna.description;

    // 5. Googleマップリンクの設定
    const mapLink = document.getElementById("mapLink");
    if (mapLink) {
        if (sauna.map) {
            mapLink.href = sauna.map;
            mapLink.style.display = "inline-block";
        } else {
            mapLink.style.display = "none"; // mapが無い場合は隠す
        }
    }
}

// 実行
initDetail();