import sqlite3
import json
import os
import uuid
import smtplib
import threading
from email.mime.text import MIMEText
from flask import Flask, request, jsonify, g, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# --- メール通知の設定（環境変数で上書き推奨。ローカル確認用に既定値を用意） ---
MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")       # 送信元Gmailアドレス
MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")       # 16桁のアプリパスワード
MAIL_TO = os.environ.get("MAIL_TO", MAIL_USERNAME)        # 通知を受け取るアドレス(未設定なら送信元と同じ)
SITE_ADMIN_URL = os.environ.get("SITE_ADMIN_URL", "https://hrs0420.github.io/fukuoka-chill-map/admin.html")

# プロジェクトフォルダの外（ユーザーのホームディレクトリ配下）にデータを保存する。
# こうすることで、VSCode Live Serverの監視対象から完全に外れ、
# DB書き込みや画像保存が原因のブラウザ自動リロードを避けられる。
STORAGE_DIR = os.environ.get(
    "STORAGE_DIR",
    os.path.join(os.path.expanduser("~"), ".fukuoka_chill_map_data")
)
os.makedirs(STORAGE_DIR, exist_ok=True)

DB_PATH = os.path.join(STORAGE_DIR, "spots.db")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "20000420")  # 本番では環境変数で必ず上書きする

UPLOAD_FOLDER = os.path.join(STORAGE_DIR, "uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE
CORS(app)  # 開発中は全許可。本番は origins=["https://hrs0420.github.io"] に絞るのが望ましい


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def send_admin_notification(category, spot_name, submitter_name):
    """管理者へ新規申請の通知メールを送る。失敗してもアプリ全体は落とさない。"""
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("メール未設定のため通知をスキップしました(MAIL_USERNAME / MAIL_PASSWORD が空)")
        return

    category_label = {"cafe": "カフェ", "sauna": "サウナ", "running": "ランニング"}.get(category, category)

    body = (
        f"新しいスポット追加依頼が届きました。\n\n"
        f"カテゴリ: {category_label}\n"
        f"スポット名: {spot_name}\n"
        f"依頼者: {submitter_name or '匿名'}\n\n"
        f"管理画面で確認・承認してください:\n{SITE_ADMIN_URL}"
    )

    msg = MIMEText(body)
    msg["Subject"] = f"【Fukuoka Chill Map】新規申請: {spot_name}"
    msg["From"] = MAIL_USERNAME
    msg["To"] = MAIL_TO

    def _send():
        try:
            with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
                server.starttls()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.sendmail(MAIL_USERNAME, [MAIL_TO], msg.as_string())
            print("管理者への通知メールを送信しました")
        except Exception as err:
            print(f"通知メールの送信に失敗しました: {err}")

    # メール送信はレスポンスを待たせないよう別スレッドで実行する
    threading.Thread(target=_send, daemon=True).start()

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

# アップロードされた画像を配信する
@app.route("/uploads/<filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

def require_admin():
    return request.headers.get("X-Admin-Token", "") == ADMIN_TOKEN


# --- 訪問者用：追加依頼を送信 ---
@app.route("/api/submissions", methods=["POST"])
def create_submission():
    # multipart/form-data で送られてくる（画像ファイルを含むため）
    category = request.form.get("category")
    if category not in ("cafe", "sauna", "running"):
        return jsonify({"error": "invalid category"}), 400

    try:
        spot_data = json.loads(request.form.get("data_json", "{}"))
    except json.JSONDecodeError:
        return jsonify({"error": "invalid data_json"}), 400

    if not spot_data.get("name"):
        return jsonify({"error": "name is required"}), 400

    # 画像ファイルの処理
    image_file = request.files.get("image")
    if image_file and image_file.filename and allowed_file(image_file.filename):
        ext = image_file.filename.rsplit(".", 1)[1].lower()
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        safe_name = secure_filename(unique_name)
        image_file.save(os.path.join(UPLOAD_FOLDER, safe_name))
        spot_data["image"] = f"{request.host_url}uploads/{safe_name}"
    else:
        spot_data.setdefault("image", "images/default.jpg")

    submitter_name = request.form.get("submitter_name", "")

    db = get_db()
    db.execute(
        "INSERT INTO submissions (category, status, data, submitter_name, submitter_note) VALUES (?, ?, ?, ?, ?)",
        (category, "pending", json.dumps(spot_data, ensure_ascii=False),
        submitter_name, request.form.get("submitter_note", "")),
    )
    db.commit()

    send_admin_notification(category, spot_data.get("name", "(名称未設定)"), submitter_name)

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