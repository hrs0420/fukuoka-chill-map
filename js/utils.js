async function loadData(fileName) {
    const response = await fetch(`data/${fileName}`);
    return await response.json();
}

// お気に入りリストを取得
function getFavorites(category) {
    return JSON.parse(localStorage.getItem(`fav_${category}`)) || [];
}

// お気に入りを追加 /　削除する
function toggleFavorite(category, id) {
    let favs = getFavorites(category);
    if (favs.includes(id)) {
        favs = favs.filter(favId => favId !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem(`fav_${category}`, JSON.stringify(favs));
    return favs;
}
// お気に入りに入っているか判定する
function isFavorite(category, id) {
    const favs = getFavorites(category);
    return favs.includes(id);
}
