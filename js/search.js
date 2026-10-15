document.addEventListener('DOMContentLoaded', initSiteSearch);

function normalizeSearchText(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g, character =>
        String.fromCharCode(character.charCodeAt(0) - 0x60)
    );
}

async function initSiteSearch() {
    const input = document.getElementById('site-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;
    let index = [];
    try {
        const response = await fetch('data/generated/search-index.json');
        if (!response.ok) throw new Error('search index unavailable');
        index = await response.json();
    } catch {
        results.textContent = '検索データを読み込めませんでした。';
        return;
    }
    const initialQuery = new URLSearchParams(location.search).get('q');
    input.addEventListener('input', () => {
        const query = normalizeSearchText(input.value.trim());
        if (!query) { results.replaceChildren(); return; }
        const matched = index.filter(item => normalizeSearchText([item.name, item.category, item.area, item.description].join(' ')).includes(query));
        const groups = [
            ['spot', 'スポット'], ['area', 'エリア'], ['article', '記事'],
        ];
        results.innerHTML = groups.map(([type, label]) => {
            const items = matched.filter(item => item.type === type);
            if (!items.length) return '';
            return `<section><h2>${label} (${items.length})</h2><ul>${items.map(item =>
                `<li><a href="${escapeHTML(item.url)}">${escapeHTML(item.name)}</a><span>${escapeHTML([item.category, item.area].filter(Boolean).join(' ・ '))}</span><p>${escapeHTML(item.description)}</p></li>`
            ).join('')}</ul></section>`;
        }).join('') || '<p>一致する結果がありません。</p>';
    });
    if (initialQuery) {
        input.value = initialQuery;
        input.dispatchEvent(new Event('input'));
    }
}
