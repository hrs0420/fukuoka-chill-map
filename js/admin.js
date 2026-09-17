// utils.jsの管理者パスワードと必ず同じ値にすること
const ADMIN_PASSWORD_FOR_GATE = "20000420";

/* 変更後 */
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
        listEl.innerHTML = "<p style='color:#888;'>該当する依頼はありません。</p>";
        return;
    }

    submissions.forEach(sub => {
        const card = document.createElement("div");
        card.className = "comment-card";
        card.style.marginBottom = "20px";

        const fieldEntries = Object.entries(sub.data)
            .map(([key, val]) => `
                <div class="form-group">
                    <label>${key}</label>
                    <input type="text" data-key="${key}" value="${String(val ?? "").replace(/"/g, "&quot;")}">
                </div>
            `).join("");

        card.innerHTML = `
            <p><strong>カテゴリ:</strong> ${sub.category} ｜ <strong>状態:</strong> ${sub.status} ｜ <strong>依頼日:</strong> ${sub.created_at}</p>
            <p><strong>依頼者:</strong> ${sub.submitter_name || "匿名"} ｜ <strong>メモ:</strong> ${sub.submitter_note || "なし"}</p>
            ${fieldEntries}
            <div style="display:flex; gap:10px; margin-top:10px; flex-wrap: wrap;">
                <button class="submit-btn save-btn" data-id="${sub.id}">保存</button>
                <button class="submit-btn approve-btn" data-id="${sub.id}" style="background:var(--color-primary);">承認</button>
                <button class="submit-btn reject-btn" data-id="${sub.id}" style="background:var(--color-rose);">却下</button>
                <button class="submit-btn delete-btn-admin" data-id="${sub.id}" style="background:#999;">削除</button>
            </div>
        `;
        listEl.appendChild(card);
    });
}

document.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    const adminToken = sessionStorage.getItem("adminToken");

    if (e.target.classList.contains("save-btn")) {
        const card = e.target.closest(".comment-card");
        const data = {};
        card.querySelectorAll("[data-key]").forEach(input => {
            data[input.dataset.key] = input.value;
        });

        await fetch(`${API_BASE_URL}/api/admin/submissions/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-Admin-Token": adminToken },
            body: JSON.stringify({ data }),
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