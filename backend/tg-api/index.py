import json
import os
import psycopg2
import urllib.request


SCHEMA = "t_p21283616_telegram_bot_message"
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, default=str)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg})}


def ensure_seeded(cur):
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.autoresponses")
    if cur.fetchone()[0] == 0:
        defaults = [
            ("/start", "Привет! Я твой бот. Введи /help для списка команд.", "command", True),
            ("/help", "Список доступных команд: /start, /help, /status", "command", True),
            ("цена", "Для уточнения цены напишите нам в @support", "keyword", True),
            ("/status", "Бот работает штатно \u2705", "command", True),
        ]
        for trigger, response, rtype, active in defaults:
            cur.execute(
                f"INSERT INTO {SCHEMA}.autoresponses (trigger, response, type, active) VALUES (%s, %s, %s, %s)",
                (trigger, response, rtype, active)
            )

    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.settings")
    if cur.fetchone()[0] == 0:
        defaults = [
            ("delete_log", "true"), ("edit_log", "true"),
            ("join_log", "false"), ("spam_filter", "true"), ("log_channel", ""),
        ]
        for key, value in defaults:
            cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES (%s, %s)", (key, value))


def handler(event: dict, context) -> dict:
    """REST API для управления ботом. Роутинг через ?action=... параметр."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    resource_id = params.get("id", "")

    conn = get_db()
    cur = conn.cursor()
    ensure_seeded(cur)

    # --- СТАТИСТИКА ---
    if action == "stats" and method == "GET":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE event_type='message' AND created_at > NOW() - INTERVAL '24 hours'")
        msg_today = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.messages WHERE created_at > NOW() - INTERVAL '24 hours'")
        active_users = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE event_type='deleted' AND created_at > NOW() - INTERVAL '24 hours'")
        deleted_today = cur.fetchone()[0]

        cur.execute(f"""
            SELECT EXTRACT(HOUR FROM created_at) as h, COUNT(*) as cnt
            FROM {SCHEMA}.messages
            WHERE created_at > NOW() - INTERVAL '24 hours' AND event_type='message'
            GROUP BY h ORDER BY h
        """)
        activity_raw = {int(row[0]): int(row[1]) for row in cur.fetchall()}
        activity = [activity_raw.get(i, 0) for i in range(24)]

        cur.execute(f"""
            SELECT event_type, username, first_name, text, created_at
            FROM {SCHEMA}.messages ORDER BY created_at DESC LIMIT 10
        """)
        events = [{"type": r[0], "username": r[1] or "", "first_name": r[2] or "", "text": (r[3] or "")[:80], "time": r[4]} for r in cur.fetchall()]

        cur.close(); conn.close()
        return ok({"msg_today": msg_today, "active_users": active_users, "deleted_today": deleted_today, "errors": 0, "activity": activity, "events": events})

    # --- АВТООТВЕТЫ ---
    if action == "autoresponses":
        if method == "GET":
            cur.execute(f"SELECT id, trigger, response, type, active FROM {SCHEMA}.autoresponses ORDER BY id")
            rows = [{"id": r[0], "trigger": r[1], "response": r[2], "type": r[3], "active": r[4]} for r in cur.fetchall()]
            cur.close(); conn.close()
            return ok(rows)

        if method == "POST":
            body = json.loads(event.get("body") or "{}")
            trigger = body.get("trigger", "").strip()
            response = body.get("response", "").strip()
            rtype = body.get("type", "keyword")
            if not trigger or not response:
                return err("trigger and response required")
            cur.execute(
                f"INSERT INTO {SCHEMA}.autoresponses (trigger, response, type, active) VALUES (%s, %s, %s, TRUE) RETURNING id",
                (trigger, response, rtype)
            )
            new_id = cur.fetchone()[0]
            conn.commit(); cur.close(); conn.close()
            return ok({"id": new_id, "trigger": trigger, "response": response, "type": rtype, "active": True})

        if method == "PUT" and resource_id:
            body = json.loads(event.get("body") or "{}")
            if "active" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET active=%s WHERE id=%s", (body["active"], resource_id))
            if "trigger" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET trigger=%s WHERE id=%s", (body["trigger"], resource_id))
            if "response" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET response=%s WHERE id=%s", (body["response"], resource_id))
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

        if method == "DELETE" and resource_id:
            cur.execute(f"UPDATE {SCHEMA}.autoresponses SET active=FALSE WHERE id=%s", (resource_id,))
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

    # --- СООБЩЕНИЯ ---
    if action == "messages" and method == "GET":
        event_filter = params.get("filter", "all")
        if event_filter == "deleted":
            where = "WHERE event_type='deleted'"
        elif event_filter == "edited":
            where = "WHERE event_type='edited'"
        else:
            where = "WHERE event_type IN ('deleted','edited')"

        cur.execute(f"""
            SELECT id, username, first_name, text, original_text, event_type, created_at
            FROM {SCHEMA}.messages {where} ORDER BY created_at DESC LIMIT 50
        """)
        rows = []
        for r in cur.fetchall():
            display = r[3] or ""
            if r[4]:
                display = f"{r[4]} \u2192 {r[3]}"
            rows.append({"id": r[0], "user": f"@{r[1]}" if r[1] else (r[2] or "Аноним"), "text": display[:120], "type": r[5], "time": r[6]})
        cur.close(); conn.close()
        return ok(rows)

    # --- НАСТРОЙКИ ---
    if action == "settings":
        if method == "GET":
            cur.execute(f"SELECT key, value FROM {SCHEMA}.settings")
            result = {row[0]: row[1] for row in cur.fetchall()}
            cur.close(); conn.close()
            return ok(result)

        if method == "PUT":
            body = json.loads(event.get("body") or "{}")
            for key, value in body.items():
                cur.execute(
                    f"INSERT INTO {SCHEMA}.settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
                    (key, str(value))
                )
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

    # --- WEBHOOK SETUP ---
    if action == "setup-webhook" and method == "POST":
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        body = json.loads(event.get("body") or "{}")
        webhook_url = body.get("webhook_url", "")
        if not webhook_url:
            return err("webhook_url required")
        tg_url = f"https://api.telegram.org/bot{token}/setWebhook"
        data = json.dumps({"url": webhook_url}).encode()
        req = urllib.request.Request(tg_url, data=data, headers={"Content-Type": "application/json"})
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        cur.close(); conn.close()
        return ok(result)

    # --- BOT INFO ---
    if action == "bot-info" and method == "GET":
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        tg_url = f"https://api.telegram.org/bot{token}/getMe"
        req = urllib.request.Request(tg_url)
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        cur.close(); conn.close()
        return ok(result)

    cur.close(); conn.close()
    return err("not found", 404)
