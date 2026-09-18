// utils.jsの管理者パスワードと必ず同じ値にすること
const ADMIN_PASSWORD_FOR_GATE = "20000420";

document.addEventListener("DOMContentLoaded", () => {
    const gate = document.getElementById("admin-gate");
    const dashboard = document.getElementById("admin-dashboard");
    const passwordInput = document.getElementById("gate-password");
    const gateSubmit = document.getElementById("gate-submit");
    const gateError = document.getElementById("gate-error");

    function unlock(token) {
        sessionStorage.setItem("adminMode", "true");
        sessionStorage.setItem("adminToken", token);
        document.body.classList.add("admin-mode");
        gate.classList.remove("active");
        dashboard.style.display = "block";
        loadSubmissions();
    }

    function tryUnlock() {
        const value = passwordInput.value.trim();
        if (value === ADMIN_PASSWORD_FOR_GATE) {
            gateError.style.display = "none";
            unlock(value);
        } else {
            gateError.style.display = "block";
        }
    }

    gateSubmit.addEventListener("click", tryUnlock);
    passwordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") tryUnlock();
    });

    document.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener("change", loadSubmissions);
    });

    // ページ読み込み時点で既にダッシュボードが表示されている(=先読みスクリプトで認証済み)場合は、そのままデータを読み込む
    if (dashboard.style.display === "block") {
        loadSubmissions();
    }
});

document.addEventListener("change", (e) => {
    if (!e.target.matches("[data-image-file]")) return;

    const file = e.target.files[0];
    if (!file) return;

    const id = e.target.dataset.imageFile;
    const preview = document.querySelector(`[data-preview-for="${id}"]`);
    if (preview) {
        preview.src = URL.createObjectURL(file);
    }
});


async function loadSubmissions() {
    const adminToken = sessionStorage.getItem("adminToken");
    const status = document.querySelector('input[name="status"]:checked').value;
    const listEl = document.getElementById("submission-list");
    listEl.innerHTML = "<p>読み込み中...</p>";

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/submissions?status=${status}`, {
            headers: { "X-Admin-Token": adminToken },
        });

        if (res.status === 401) {
            listEl.innerHTML = "<p style='color:var(--color-rose);'>認証に失敗しました。再度パスワードを入力してください。</p>";
            return;
        }

        const submissions = await res.json();
        renderSubmissions(submissions);
    } catch (err) {
        console.error(err);
        listEl.innerHTML = "<p style='color:var(--color-rose);'>読み込みに失敗しました。バックエンドの起動状況を確認してください。</p>";
    }
}

function renderSubmissions(submissions) {
    const listEl = document.getElementById("submission-list");
    listEl.innerHTML = "";

    if (submissions.length === 0) {
        listEl.innerHTML = "<p style='color:#888; text-align:center;'>該当する依頼はありません。</p>";
        return;
    }

    const categoryLabel = { cafe: "☕ カフェ", sauna: "🧖 サウナ", running: "🏃 ランニング" };
    const statusLabel = { pending: "承認待ち", approved: "承認済み", rejected: "却下済み" };

    submissions.forEach(sub => {
        const card = document.createElement("div");
        card.className = "submission-card";
        card.dataset.id = sub.id;

        const data = sub.data || {};
        const fields = FIELD_CONFIG[sub.category] || [];

        // 基本項目(申請フォームと同じ並び)
        const basicFieldsHTML = `
            <div class="form-group">
                <label>スポット名</label>
                <input type="text" data-key="name" value="${String(data.name ?? "").replace(/"/g, "&quot;")}">
            </div>
            <div class="form-group">
                <label>エリア</label>
                <input type="text" data-key="area" value="${String(data.area ?? "").replace(/"/g, "&quot;")}">
            </div>
            <div class="form-group">
                <label>評価</label>
                <input type="number" step="0.1" min="1" max="5" data-key="rating" value="${String(data.rating ?? "")}">
            </div>
            <div class="form-group">
                <label>紹介文</label>
                <textarea rows="3" data-key="description">${String(data.description ?? "")}</textarea>
            </div>
            <div class="form-group">
                <label>画像</label>
                ${data.image ? `<img src="${data.image}" alt="" class="admin-image-preview" data-preview-for="${sub.id}">` : ""}
                <input type="hidden" data-key="image" value="${String(data.image ?? "").replace(/"/g, "&quot;")}">
                <input type="file" accept="image/png, image/jpeg, image/webp" data-image-file="${sub.id}">
                <p class="file-drop-hint">選択すると既存の画像を置き換えます（未選択なら現在の画像のまま保存されます）</p>
            </div>
            <div class="form-group">
                <label>住所</label>
                <input type="text" data-key="address" value="${String(data.address ?? "").replace(/"/g, "&quot;")}">
            </div>
            <div class="form-group">
                <label>Googleマップリンク</label>
                <input type="text" data-key="map" value="${String(data.map ?? "").replace(/"/g, "&quot;")}">
            </div>
        `;

        // カテゴリ固有項目(チェックボックス/テキスト)
        const categoryFieldsHTML = fields.map(field => {
            const value = data[field.key];
            if (field.type === "bool") {
                return `
                    <div class="checkbox-field">
                        <input type="checkbox" id="admin-${sub.id}-${field.key}" data-key="${field.key}" data-type="bool" ${value ? "checked" : ""}>
                        <label for="admin-${sub.id}-${field.key}"><i data-lucide="${field.icon}"></i> ${field.label}</label>
                    </div>
                `;
            }
            return `
                <div class="form-group">
                    <label><i data-lucide="${field.icon}"></i> ${field.label}</label>
                    <input type="text" data-key="${field.key}" data-type="text" value="${String(value ?? "").replace(/"/g, "&quot;")}">
                </div>
            `;
        }).join("");

        card.innerHTML = `
            <div class="submission-card-header">
                <h4>${data.name || "(名称未設定)"}</h4>
                <span class="status-badge ${sub.status}">${statusLabel[sub.status] || sub.status}</span>
            </div>
            <p class="submission-meta">
                ${categoryLabel[sub.category] || sub.category} ｜ 依頼者: ${sub.submitter_name || "匿名"} ｜ ${sub.created_at}
                ${sub.submitter_note ? `｜ メモ: ${sub.submitter_note}` : ""}
            </p>
            ${basicFieldsHTML}
            ${categoryFieldsHTML}
            <div class="submission-actions">
                <button class="submit-btn save-btn" data-id="${sub.id}">保存</button>
                <button class="submit-btn approve-btn" data-id="${sub.id}" style="background:var(--color-primary);">承認</button>
                <button class="submit-btn reject-btn" data-id="${sub.id}" style="background:var(--color-rose);">却下</button>
                <button class="submit-btn delete-btn-admin" data-id="${sub.id}" style="background:#999;">削除</button>
            </div>
        `;
        listEl.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
}

document.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const adminToken = sessionStorage.getItem("adminToken");

    if (e.target.classList.contains("save-btn")) {
        const card = e.target.closest(".submission-card");
        const data = {};
        card.querySelectorAll("[data-key]").forEach(input => {
            if (input.dataset.type === "bool") {
                data[input.dataset.key] = input.checked;
            } else if (input.dataset.key === "rating") {
                data[input.dataset.key] = parseFloat(input.value);
            } else {
                data[input.dataset.key] = input.value;
            }
        });

        const formData = new FormData();
        formData.append("data_json", JSON.stringify(data));

        const imageFileInput = card.querySelector("[data-image-file]");
        const newImageFile = imageFileInput?.files[0];
        if (newImageFile) {
            formData.append("image", newImageFile);
        }

        await fetch(`${API_BASE_URL}/api/admin/submissions/${id}`, {
            method: "PUT",
            headers: { "X-Admin-Token": adminToken },
            body: formData,
        });
        alert("保存しました");
        loadSubmissions();
    }

    if (e.target.classList.contains("approve-btn")) {
        await fetch(`${API_BASE_URL}/api/admin/submissions/${id}/approve`, {
            method: "POST",
            headers: { "X-Admin-Token": adminToken },
        });
        loadSubmissions();
    }

    if (e.target.classList.contains("reject-btn")) {
        await fetch(`${API_BASE_URL}/api/admin/submissions/${id}/reject`, {
            method: "POST",
            headers: { "X-Admin-Token": adminToken },
        });
        loadSubmissions();
    }

    if (e.target.classList.contains("delete-btn-admin")) {
        if (!confirm("完全に削除しますか？")) return;
        await fetch(`${API_BASE_URL}/api/admin/submissions/${id}`, {
            method: "DELETE",
            headers: { "X-Admin-Token": adminToken },
        });
        loadSubmissions();
    }
});