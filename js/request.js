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

    const imageInput = document.getElementById("image");
    const imagePreview = document.getElementById("image-preview");

    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        if (!file) {
            imagePreview.style.display = "none";
            return;
        }
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
    });

    const openConfirmBtn = document.getElementById("open-confirm-btn");
    const confirmModal = document.getElementById("confirm-submit-modal");
    const cancelConfirmBtn = document.getElementById("cancel-confirm-btn");
    const proceedSubmitBtn = document.getElementById("proceed-submit-btn");

    // 「依頼を送信する」ボタン：まずHTML標準の必須項目チェックをした上で確認モーダルを開く
    openConfirmBtn.addEventListener("click", () => {
        if (!form.reportValidity()) return; // 必須項目が未入力ならブラウザ標準の警告を出して中断
        confirmModal.classList.add("active");
    });

    cancelConfirmBtn.addEventListener("click", () => {
        confirmModal.classList.remove("active");
    });

    proceedSubmitBtn.addEventListener("click", async () => {
        confirmModal.classList.remove("active");
        statusEl.textContent = "送信中...";

        const category = categorySelect.value;

        const data = {
            name: document.getElementById("name").value.trim(),
            area: document.getElementById("area").value.trim(),
            description: document.getElementById("description").value.trim(),
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

        const formData = new FormData();
        formData.append("category", category);
        formData.append("data_json", JSON.stringify(data));
        formData.append("submitter_name", document.getElementById("submitter-name").value.trim());
        formData.append("submitter_note", document.getElementById("submitter-note").value.trim());

        const imageFile = document.getElementById("image").files[0];
        if (imageFile) {
            formData.append("image", imageFile);
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/submissions`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("送信に失敗しました");

            statusEl.textContent = "";
            form.reset();
            imagePreview.style.display = "none";
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