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

// ---ハンバーガーメニューの開閉処理---
document.addEventListener("DOMContentLoaded", () => {
    const hamburger = document.getElementById("hamburger-btn");
    const navMenu = document.getElementById("nav-menu");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });
    }
});
// --- 管理者モード（©マークを5回クリック→パスワードで切り替え） ---
(function () {
    const ADMIN_PASSWORD = "20000420"; // ★好きなパスワードに変更してください

    let clickCount = 0;
    let clickTimer = null;

    document.addEventListener("DOMContentLoaded", () => {
        // ページを開いた時点で既に管理者モードが有効なら復元する
        if (sessionStorage.getItem("adminMode") === "true") {
            document.body.classList.add("admin-mode");
        }

        const copyright = document.getElementById("copyright");
        if (!copyright) return;

        copyright.addEventListener("click", () => {
            clickCount++;

            // 2秒以内に5回クリックしないとカウントをリセット
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

            if (clickCount >= 5) {
                clickCount = 0;

                if (document.body.classList.contains("admin-mode")) {
                    // 既にONならパスワード無しでOFFに戻す
                    document.body.classList.remove("admin-mode");
                    sessionStorage.removeItem("adminMode");
                    document.dispatchEvent(new CustomEvent("adminModeChanged"));
                    alert("管理者モードを解除しました。");
                    return;
                }

                const input = prompt("管理者パスワードを入力してください：");
                if (input === ADMIN_PASSWORD) {
                    document.body.classList.add("admin-mode");
                    sessionStorage.setItem("adminMode", "true");
                    document.dispatchEvent(new CustomEvent("adminModeChanged"));
                    alert("管理者モードに変更しました。");
                } else if (input !== null) {
                }
            }
        });
    });
})();