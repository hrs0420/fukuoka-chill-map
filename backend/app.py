import sqlite3
import json
import os
from flask import Flask, request, jsonify, g
from flask_cors import CORS

DB_PATH = os.path.join(os.path.dirname(__file__), "spots.db")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "20000420")  # 本番では環境変数で必ず上書きする

app = Flask(__name__)
CORS(app)  # 開発中は全許可。本番は origins=["https://hrs0420.github.io"] に絞るのが望ましい


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            data TEXT NOT NULL,
            submitter_name TEXT,
            submitter_note TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.commit()
    db.close()


def require_admin():
    return request.headers.get("X-Admin-Token", "") == ADMIN_TOKEN


# --- 訪問者用：追加依頼を送信 ---
@app.route("/api/submissions", methods=["POST"])
def create_submission():
    payload = request.get_json(force=True)
    category = payload.get("category")
    if category not in ("cafe", "sauna", "running"):
        return jsonify({"error": "invalid category"}), 400

    spot_data = payload.get("data", {})
    if not spot_data.get("name"):
        return jsonify({"error": "name is required"}), 400

    db = get_db()
    db.execute(
        "INSERT INTO submissions (category, status, data, submitter_name, submitter_note) VALUES (?, ?, ?, ?, ?)",
        (category, "pending", json.dumps(spot_data, ensure_ascii=False),
        payload.get("submitter_name", ""), payload.get("submitter_note", "")),
    )
    db.commit()
    return jsonify({"message": "submitted"}), 201


# --- 全訪問者用：承認済みスポットの取得（サイト表示用） ---
@app.route("/api/spots", methods=["GET"])
def get_approved_spots():
    category = request.args.get("category")
    db = get_db()

    if category:
        rows = db.execute(
            "SELECT id, data FROM submissions WHERE status = 'approved' AND category = ?",
            (category,),
        ).fetchall()
    else:
        rows = db.execute("SELECT id, data FROM submissions WHERE status = 'approved'").fetchall()

    spots = []
    for row in rows:
        spot = json.loads(row["data"])
        spot["submissionId"] = row["id"]
        spots.append(spot)
    return jsonify(spots)


# --- 管理者用：一覧取得 ---
@app.route("/api/admin/submissions", methods=["GET"])
def admin_list_submissions():
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 401

    status = request.args.get("status")
    db = get_db()
    if status:
        rows = db.execute(
            "SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC", (status,)
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM submissions ORDER BY created_at DESC").fetchall()

    return jsonify([{
        "id": r["id"], "category": r["category"], "status": r["status"],
        "data": json.loads(r["data"]), "submitter_name": r["submitter_name"],
        "submitter_note": r["submitter_note"], "created_at": r["created_at"],
    } for r in rows])


# --- 管理者用：内容の加筆修正 ---
@app.route("/api/admin/submissions/<int:submission_id>", methods=["PUT"])
def admin_update_submission(submission_id):
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 401

    new_data = request.get_json(force=True).get("data")
    if new_data is None:
        return jsonify({"error": "data is required"}), 400

    db = get_db()
    db.execute(
        "UPDATE submissions SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (json.dumps(new_data, ensure_ascii=False), submission_id),
    )
    db.commit()
    return jsonify({"message": "updated"})


# --- 管理者用：承認 / 却下 / 削除 ---
@app.route("/api/admin/submissions/<int:submission_id>/approve", methods=["POST"])
def admin_approve(submission_id):
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 401
    db = get_db()
    db.execute("UPDATE submissions SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (submission_id,))
    db.commit()
    return jsonify({"message": "approved"})


@app.route("/api/admin/submissions/<int:submission_id>/reject", methods=["POST"])
def admin_reject(submission_id):
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 401
    db = get_db()
    db.execute("UPDATE submissions SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (submission_id,))
    db.commit()
    return jsonify({"message": "rejected"})


@app.route("/api/admin/submissions/<int:submission_id>", methods=["DELETE"])
def admin_delete(submission_id):
    if not require_admin():
        return jsonify({"error": "unauthorized"}), 401
    db = get_db()
    db.execute("DELETE FROM submissions WHERE id = ?", (submission_id,))
    db.commit()
    return jsonify({"message": "deleted"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)