document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category");
    const fieldsContainer = document.getElementById("category-fields");
    const form = document.getElementById("request-form");
    const statusEl = document.getElementById("form-status");

    
    function renderCategoryFields() {
        const category = categorySelect.value;
        const fields = FIELD_CONFIG[category] || [];
        fieldsContainer.innerHTML = "";

        fields.forEach((field, index) => {
            const wrapper = document.createElement("div");

            if (field.type === "bool") {
                const inputId = `field-${field.key}-${index}`;
                wrapper.className = "checkbox-field";
                wrapper.innerHTML = `
                    <input type="checkbox" id="${inputId}" data-field="${field.key}" data-type="bool">
                    <label for="${inputId}"><i data-lucide="${field.icon}"></i> ${field.label}</label>
                `;
            } else {
                wrapper.className = "form-group";
                wrapper.innerHTML = `
                    <label><i data-lucide="${field.icon}"></i> ${field.label}</label>
                    <input type="text" data-field="${field.key}" data-type="text">
                `;
            }
            fieldsContainer.appendChild(wrapper);
        });

        if (window.lucide) lucide.createIcons();
    }

    categorySelect.addEventListener("change", renderCategoryFields);
    renderCategoryFields();

    // 画像プレビュー・ドラッグ&ドロップの制御
    const dropWrapper = document.getElementById("file-drop-wrapper");
    const dropInstructions = document.getElementById("drop-instructions");
    const previewWrapper = document.getElementById("preview-wrapper");
    const imageInput = document.getElementById("image");
    const imagePreview = document.getElementById("image-preview");
    const removeImageBtn = document.getElementById("remove-image-btn");

    function showPreview(file) {
        imagePreview.src = URL.createObjectURL(file);
        dropInstructions.style.display = "none";
        previewWrapper.style.display = "block";
    }

    function clearPreview() {
        imageInput.value = "";
        imagePreview.src = "";
        dropInstructions.style.display = "block";
        previewWrapper.style.display = "none";
    }

    imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        if (file) showPreview(file);
    });

    removeImageBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        clearPreview();
    });

    ["dragenter", "dragover"].forEach(eventName => {
        dropWrapper.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropWrapper.classList.add("drag-over");
        });
    });

    ["dragleave", "drop"].forEach(eventName => {
        dropWrapper.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropWrapper.classList.remove("drag-over");
        });
    });

    dropWrapper.addEventListener("drop", (e) => {
        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith("image/")) return;

        // ドロップされたファイルを input[type=file] に反映させる
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;

        showPreview(file);
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
            rating: parseFloat(document.getElementById("rating").value),
        };

        // 口コミが入力されていれば、既存のJSONデータと同じ形式(reviews配列)で含める
        const reviewText = document.getElementById("initial-review").value.trim();
        if (reviewText) {
            data.reviews = [{
                author: document.getElementById("submitter-name").value.trim() || "匿名",
                score: data.rating,
                comment: reviewText,
            }];
        }

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