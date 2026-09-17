document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category");
    const fieldsContainer = document.getElementById("category-fields");
    const form = document.getElementById("request-form");
    const statusEl = document.getElementById("form-status");

    function renderCategoryFields() {
        const category = categorySelect.value;
        const fields = FIELD_CONFIG[category] || [];
        fieldsContainer.innerHTML = "";

        fields.forEach(field => {
            const wrapper = document.createElement("div");
            wrapper.className = "form-group";

            if (field.type === "bool") {
                wrapper.innerHTML = `
                    <label>
                        <input type="checkbox" data-field="${field.key}" data-type="bool">
                        ${field.icon} ${field.label}
                    </label>
                `;
            } else {
                wrapper.innerHTML = `
                    <label>${field.icon} ${field.label}</label>
                    <input type="text" data-field="${field.key}" data-type="text">
                `;
            }
            fieldsContainer.appendChild(wrapper);
        });
    }

    categorySelect.addEventListener("change", renderCategoryFields);
    renderCategoryFields();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusEl.textContent = "送信中...";

        const category = categorySelect.value;

        const data = {
            name: document.getElementById("name").value.trim(),
            area: document.getElementById("area").value.trim(),
            description: document.getElementById("description").value.trim(),
            image: document.getElementById("image").value.trim() || "images/default.jpg",
            address: document.getElementById("address").value.trim(),
            map: document.getElementById("map").value.trim(),
            rating: null,
        };

        fieldsContainer.querySelectorAll("[data-field]").forEach(input => {
            if (input.dataset.type === "bool") {
                data[input.dataset.field] = input.checked;
            } else {
                data[input.dataset.field] = input.value.trim();
            }
        });

        const payload = {
            category,
            data,
            submitter_name: document.getElementById("submitter-name").value.trim(),
            submitter_note: document.getElementById("submitter-note").value.trim(),
        };

        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("送信に失敗しました");

            statusEl.textContent = "";
            form.reset();
            renderCategoryFields();
            document.getElementById("submit-success-modal").classList.add("active");
        } catch (err) {
            console.error(err);
            statusEl.textContent = "❌ 送信に失敗しました。バックエンドが起動しているか確認してください。";
        }
    });

    document.getElementById("continue-btn").addEventListener("click", () => {
        document.getElementById("submit-success-modal").classList.remove("active");
    });
});