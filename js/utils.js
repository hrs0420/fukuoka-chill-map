async function loadData(fileName) {
    const response = await fetch(`data/${fileName}`);
    return await response.json();
}