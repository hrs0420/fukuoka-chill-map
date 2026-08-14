/*
 * カフェ・サウナ・ランニング共通の一覧ページ用スクリプト。
 *
 * このファイルは「categories.js の設定を読んで、その通りに描画する」だけの
 * 汎用エンジンです。cafe/sauna/running を名指しした分岐（if文など）は
 * このファイルには一切書きません。
 * 表示内容を変えたいときは categories.js の CATEGORY_CONFIG を編集してください。
 *
 * ★今回追加した部分★
 * 検索・絞り込み・並び替えの状態をURLの ?q=...&area=...&sort=... に反映する。
 * ページ読み込み時にはURLの値を初期状態として使うので、
 * 「この条件で絞り込んだ状態のURL」をそのまま共有・ブックマークできる。
 */

let allItems = [];   // 現在のカテゴリの全データ
let config = null;   // 現在のカテゴリの設定（CATEGORY_CONFIGの中の1つ）

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");

    config = CATEGORY_CONFIG[category];

    if (!config) {
        // ?category= が無い、または存在しないカテゴリ名だった場合
        alert("ページが見つかりません。");
        window.location.href = "index.html";
        return;
    }

    document.title = `${config.pageTitle} | Fukuoka Chill Map`;
    document.getElementById("page-title").textContent = config.pageTitle;

    allItems = await loadData(config.dataFile);

    buildSearchBar();
    buildFilterBar();
    render();
}

// 検索ボックスを生成（URLに ?q= があれば初期値として反映）
function buildSearchBar() {
    const container = document.getElementById("search-container");
    container.innerHTML = `
        <input type="text" id="search" placeholder="${config.searchPlaceholder}">
    `;

    const input = document.getElementById("search");
    input.value = new URLSearchParams(window.location.search).get("q") || "";
    input.addEventListener("input", render);
}

// チェックボックス・エリア選択・並び替えを生成（URLの値があれば初期状態として反映）
function buildFilterBar() {
    const container = document.getElementById("filter-container");
    container.innerHTML = "";

    const urlParams = new URLSearchParams(window.location.search);

    // --- カテゴリ固有のチェックボックス（categories.js の filters から生成） ---
    config.filters.forEach(f => {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" id="filter-${f.key}"> ${f.label}`;
        container.appendChild(label);

        const checkbox = label.querySelector("input");
        checkbox.checked = urlParams.get(f.key) === "1"; // URLに ?wifi=1 等があればON
        checkbox.addEventListener("change", render);
    });

    // --- エリア選択（固定値を書かず、読み込んだデータから自動生成） ---
    const areas = [...new Set(allItems.map(item => item.area).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "ja"));

    const areaLabel = document.createElement("label");
    areaLabel.innerHTML = `
        エリア
        <select id="area">
            <option value="">すべてのエリア</option>
            ${areas.map(a => `<option value="${a}">${a}</option>`).join("")}
        </select>
    `;
    container.appendChild(areaLabel);

    const areaSelect = areaLabel.querySelector("select");
    areaSelect.value = urlParams.get("area") || ""; // 該当する選択肢が無ければ自動的に「すべて」のまま
    areaSelect.addEventListener("change", render);

    // --- 並び替え（categories.js の sortOptions から生成） ---
    const sortLabel = document.createElement("label");
    sortLabel.innerHTML = `
        並び替え
        <select id="sort">
            ${config.sortOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join("")}
        </select>
    `;
    container.appendChild(sortLabel);

    const sortSelect = sortLabel.querySelector("select");
    sortSelect.value = urlParams.get("sort") || config.sortOptions[0].value;
    sortSelect.addEventListener("change", render);
}

// 検索・絞り込み・並び替え・描画・URL同期をまとめて実行
function render() {
    updateURL(); // ← 今のフォームの状態をURLに書き戻す

    const keyword = (document.getElementById("search")?.value || "").toLowerCase().trim();
    const areaValue = document.getElementById("area")?.value || "";
    const sortValue = document.getElementById("sort")?.value || config.sortOptions[0].value;

    const filtered = allItems.filter(item => {
        const matchesKeyword = config.searchFields.some(fieldKey =>
            String(item[fieldKey] || "").toLowerCase().includes(keyword)
        );

        const matchesArea = !areaValue || item.area === areaValue;

        const matchesFilters = config.filters.every(f => {
            const checkbox = document.getElementById(`filter-${f.key}`);
            return !checkbox.checked || item[f.key] === true;
        });

        return matchesKeyword && matchesArea && matchesFilters;
    });

    filtered.sort((a, b) => sortCompare(a, b, sortValue));

    displayList(filtered);
}

// 現在のフォームの状態を読み取り、URLの ?q=...&area=...&sort=... に反映する
function updateURL() {
    const params = new URLSearchParams(window.location.search);
    // category はそのまま維持する（この関数では触らない）

    const keyword = document.getElementById("search")?.value || "";
    const areaValue = document.getElementById("area")?.value || "";
    const sortValue = document.getElementById("sort")?.value || "";

    // 値が空ならURLからパラメータごと消す（?q=&area=のように空で残さないため）
    keyword ? params.set("q", keyword) : params.delete("q");
    areaValue ? params.set("area", areaValue) : params.delete("area");
    sortValue ? params.set("sort", sortValue) : params.delete("sort");

    config.filters.forEach(f => {
        const checked = document.getElementById(`filter-${f.key}`)?.checked;
        checked ? params.set(f.key, "1") : params.delete(f.key);
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, "", newUrl); // ページ再読み込みなしでURLだけ書き換える
}

// 並び替え比較関数（sortOptionsのvalueに応じて分岐。カテゴリ名では分岐しない）
function sortCompare(a, b, sortValue) {
    switch (sortValue) {
        case "rating-desc":
            return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
        case "rating-asc":
            return (parseFloat(a.rating) || 0) - (parseFloat(b.rating) || 0);
        case "distance-asc":
            return (parseFloat(a.distance) || 0) - (parseFloat(b.distance) || 0);
        case "distance-desc":
            return (parseFloat(b.distance) || 0) - (parseFloat(a.distance) || 0);
        case "name-asc":
            return a.name.localeCompare(b.name, "ja");
        default:
            return 0;
    }
}

// カード一覧を描画
function displayList(items) {
    const grid = document.getElementById("list-grid");
    grid.innerHTML = "";

    if (items.length === 0) {
        grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #888;'>該当するスポットが見つかりませんでした。</p>";
        return;
    }

    const favorites = JSON.parse(localStorage.getItem(config.storageKey)) || [];

    items.forEach(item => {
        const tagsLine = config.cardTags
            ? `<p><small style="color: #666;">${config.cardTags(item)}</small></p>`
            : "";

        grid.innerHTML += `
        <a href="detail.html?name=${encodeURIComponent(item.name)}&type=${config.type}" class="card-link">
            <div class="card">
                <img src="${item.image}" alt="${item.name}" class="cafe-image">
                <h2>
                    ${item.name}
                    <span class="favorite" data-name="${item.name}">
                        ${favorites.includes(item.name) ? "❤️" : "🤍"}
                    </span>
                </h2>
                <p>📍 ${item.area}</p>
                <p>⭐ ${item.rating}</p>
                ${tagsLine}
                <p>${item.description}</p>
            </div>
        </a>
        `;
    });
}

// お気に入りハートのクリック処理（カテゴリ共通）
document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("favorite") || !config) return;
    e.preventDefault();

    const name = e.target.dataset.name;
    let favorites = JSON.parse(localStorage.getItem(config.storageKey)) || [];

    if (favorites.includes(name)) {
        favorites = favorites.filter(f => f !== name);
    } else {
        favorites.push(name);
    }

    localStorage.setItem(config.storageKey, JSON.stringify(favorites));
    render();
});