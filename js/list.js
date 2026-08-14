/*
 * カフェ・サウナ・ランニング共通の一覧ページ用スクリプト。
 *
 * このファイルは「categories.js の設定を読んで、その通りに描画する」だけの
 * 汎用エンジンです。cafe/sauna/running を名指しした分岐（if文など）は
 * このファイルには一切書きません。
 * 表示内容を変えたいときは categories.js の CATEGORY_CONFIG を編集してください。
 *
 * 検索・絞り込み・並び替えの状態はURLの ?q=...&area=...&sort=... に反映される。
 * ★今回追加した部分★
 * 検索欄に入力すると、名前が部分一致するスポットを候補として下に表示する（オートコンプリート）。
 */

let allItems = [];   // 現在のカテゴリの全データ
let config = null;   // 現在のカテゴリの設定（CATEGORY_CONFIGの中の1つ）

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category");

    config = CATEGORY_CONFIG[category];

    if (!config) {
        alert("ページが見つかりません。");
        window.location.href = "index.html";
        return;
    }

    document.title = `${config.pageTitle} | Fukuoka Chill Map`;
    document.getElementById("page-title").textContent = config.pageTitle;
    // --- SEO: カテゴリごとのtitle / description / canonical / OGP ---
    function setMeta(nameOrProp, content, isProperty = false) {
        const attr = isProperty ? "property" : "name";
        let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`);
        if (!el) {
            el = document.createElement("meta");
            el.setAttribute(attr, nameOrProp);
            document.head.appendChild(el);
        }
        el.setAttribute("content", content);
    }

    setMeta("description", `福岡の${config.pageTitle}。エリアや条件で絞り込んで検索できます。`);
    setMeta("og:title", `${config.pageTitle} | Fukuoka Chill Map`, true);
    setMeta("og:type", "website", true);

    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
        canonicalTag = document.createElement("link");
        canonicalTag.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalTag);
    }
    // 検索キーワードや並び替え条件はcanonicalに含めない（重複コンテンツ対策）
    canonicalTag.setAttribute("href", `${location.origin}${location.pathname}?category=${category}`);

    allItems = await loadData(config.dataFile);

    buildSearchBar();
    buildFilterBar();
    render();
}

// 検索ボックス＋候補リストを生成
function buildSearchBar() {
    const container = document.getElementById("search-container");
    container.innerHTML = `
        <div class="search-wrapper">
            <input type="text" id="search" placeholder="${config.searchPlaceholder}" autocomplete="off">
            <ul id="search-suggestions" class="search-suggestions hidden"></ul>
        </div>
    `;

    const input = document.getElementById("search");
    input.value = new URLSearchParams(window.location.search).get("q") || "";

    input.addEventListener("input", () => {
        renderSuggestions(input.value);
        render();
    });

    // 入力欄にフォーカスした時点で、既に入力済みの文字があれば候補を出す
    input.addEventListener("focus", () => {
        renderSuggestions(input.value);
    });

    // Escapeキーで候補を閉じる
    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideSuggestions();
    });

    // 候補リストの外側をクリックしたら閉じる
    document.addEventListener("click", (e) => {
        const wrapper = document.querySelector(".search-wrapper");
        if (wrapper && !wrapper.contains(e.target)) {
            hideSuggestions();
        }
    });
}

// 検索候補を描画する
function renderSuggestions(keyword) {
    const ul = document.getElementById("search-suggestions");
    if (!ul) return;

    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) {
        hideSuggestions();
        return;
    }

    const matches = allItems
        .filter(item => item.name.toLowerCase().includes(trimmed))
        .slice(0, 6); // 候補は多すぎても邪魔なので最大6件

    if (matches.length === 0) {
        hideSuggestions();
        return;
    }

    ul.innerHTML = matches
        .map(item => `<li data-name="${item.name.replace(/"/g, "&quot;")}">${item.name}</li>`)
        .join("");
    ul.classList.remove("hidden");

    ul.querySelectorAll("li").forEach(li => {
        // click ではなく mousedown を使う理由：
        // input の blur（フォーカス外れ）が click より先に発火して候補が消えてしまい、
        // クリックが空振りする問題を避けるため
        li.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const input = document.getElementById("search");
            input.value = li.dataset.name;
            hideSuggestions();
            render();
        });
    });
}

function hideSuggestions() {
    const ul = document.getElementById("search-suggestions");
    if (ul) {
        ul.classList.add("hidden");
        ul.innerHTML = "";
    }
}

// チェックボックス・エリア選択・並び替えを生成（URLの値があれば初期状態として反映）
function buildFilterBar() {
    const container = document.getElementById("filter-container");
    container.innerHTML = "";

    const urlParams = new URLSearchParams(window.location.search);

    config.filters.forEach(f => {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" id="filter-${f.key}"> ${f.label}`;
        container.appendChild(label);

        const checkbox = label.querySelector("input");
        checkbox.checked = urlParams.get(f.key) === "1";
        checkbox.addEventListener("change", render);
    });

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
    areaSelect.value = urlParams.get("area") || "";
    areaSelect.addEventListener("change", render);

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
    updateURL();

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

function updateURL() {
    const params = new URLSearchParams(window.location.search);

    const keyword = document.getElementById("search")?.value || "";
    const areaValue = document.getElementById("area")?.value || "";
    const sortValue = document.getElementById("sort")?.value || "";

    keyword ? params.set("q", keyword) : params.delete("q");
    areaValue ? params.set("area", areaValue) : params.delete("area");
    sortValue ? params.set("sort", sortValue) : params.delete("sort");

    config.filters.forEach(f => {
        const checked = document.getElementById(`filter-${f.key}`)?.checked;
        checked ? params.set(f.key, "1") : params.delete(f.key);
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    history.replaceState(null, "", newUrl);
}

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