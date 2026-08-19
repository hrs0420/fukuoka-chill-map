/*
 * カテゴリ（カフェ・サウナ・ランニング）ごとの設定を1箇所にまとめたファイル。
 *
 * ★このファイルが「1つを直せば3つに反映される」の本体です★
 *
 * list.html / list.js / favorites.js / detail.js は、
 * ここに書かれた設定だけを見て動きます。
 * カテゴリ固有の項目（Wi-Fiやロウリュ、距離など）を追加・変更したいときは、
 * このファイルの該当カテゴリの設定を編集するだけでOKです。
 * list.html や list.js 自体を触る必要はありません。
 */

const CATEGORY_CONFIG = {

    cafe: {
        type: "cafe",                 // detail.html への type パラメータ
        dataFile: "cafes.json",
        storageKey: "favorites",       // お気に入りのlocalStorageキー
        pageTitle: "☕ カフェ一覧",
        searchPlaceholder: "カフェ名で検索...",
        searchFields: ["name", "description"], // 検索キーワードの対象にするプロパティ

        // 一覧画面のチェックボックス絞り込み
        filters: [
            { key: "wifi", label: "Wi-Fiあり" },
            { key: "outlet", label: "コンセントあり" },
        ],

        // 並び替えの選択肢
        sortOptions: [
            { value: "rating-desc", label: "評価が高い順" },
            { value: "rating-asc", label: "評価が低い順" },
            { value: "name-asc", label: "名前順（あいうえお順）" },
        ],

        // カード内に追加でタグ行を出したい場合はここに関数を書く（カフェは無し）
        cardTags: null,
    },

    sauna: {
        type: "sauna",
        dataFile: "saunas.json",
        storageKey: "saunaFavorites",
        pageTitle: "♨ サウナ一覧",
        searchPlaceholder: "サウナ名で検索...",
        searchFields: ["name", "description"],

        filters: [
            { key: "onsen", label: "温浴あり" },
            { key: "loyly", label: "ロウリュあり" },
            { key: "stay", label: "宿泊可能" },
            { key: "parking", label: "駐車場あり" },
        ],

        sortOptions: [
            { value: "rating-desc", label: "評価が高い順" },
            { value: "rating-asc", label: "評価が低い順" },
            { value: "name-asc", label: "名前順（あいうえお順）" },
        ],

        cardTags: null,
    },

    running: {
        type: "running",
        dataFile: "running.json",
        storageKey: "runningFavorites",
        pageTitle: "🏃 ランニングスポット一覧",
        searchPlaceholder: "スポット名で検索...",
        searchFields: ["name", "description", "surface"],

        filters: [
            { key: "lighted", label: "夜間照明あり" },
            { key: "locker", label: "ロッカーあり" },
            { key: "bathroom", label: "トイレあり" },
        ],

        sortOptions: [
            { value: "rating-desc", label: "評価が高い順" },
            { value: "rating-asc", label: "評価が低い順" },
            { value: "distance-asc", label: "距離が短い順" },
            { value: "distance-desc", label: "距離が長い順" },
            { value: "name-asc", label: "名前順（あいうえお順）" },
        ],

        // ランニングだけ、カードに「🏃1周: / 🛣路面: / 💡ナイター」等のタグ行を出す
        cardTags: (item) => [
            `🏃 1周: ${item.distance}`,
            `🛣 ${item.surface}`,
            item.lighted ? "💡 ナイター" : "",
            item.locker ? "🎒 ロッカー" : "",
            item.bathroom ? "🚽 トイレ" : "",
        ].filter(Boolean),
    },

};
