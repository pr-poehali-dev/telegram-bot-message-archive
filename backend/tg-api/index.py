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


def handler(event: dict, context) -> dict:
    """REST API для управления ботом: автоответы, настройки, статистика, сообщения."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/").rstrip("/") or "/"
    params = event.get("queryStringParameters") or {}

    conn = get_db()
    cur = conn.cursor()

    # --- СТАТИСТИКА ---
    if path == "/stats" and method == "GET":
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE event_type='message' AND created_at > NOW() - INTERVAL '24 hours'")
        msg_today = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(DISTINCT user_id) FROM {SCHEMA}.messages WHERE created_at > NOW() - INTERVAL '24 hours'")
        active_users = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE event_type='deleted' AND created_at > NOW() - INTERVAL '24 hours'")
        deleted_today = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE event_type='message' AND created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at")
        errors = 0

        # Активность по часам (24 бара)
        cur.execute(f"""
            SELECT EXTRACT(HOUR FROM created_at) as h, COUNT(*) as cnt
            FROM {SCHEMA}.messages
            WHERE created_at > NOW() - INTERVAL '24 hours' AND event_type='message'
            GROUP BY h ORDER BY h
        """)
        activity_raw = {int(row[0]): int(row[1]) for row in cur.fetchall()}
        activity = [activity_raw.get(i, 0) for i in range(24)]

        # Последние события
        cur.execute(f"""
            SELECT event_type, username, first_name, text, created_at
            FROM {SCHEMA}.messages
            ORDER BY created_at DESC LIMIT 10
        """)
        events = []
        for row in cur.fetchall():
            events.append({
                "type": row[0],
                "username": row[1] or "",
                "first_name": row[2] or "",
                "text": (row[3] or "")[:80],
                "time": row[4],
            })

        cur.close(); conn.close()
        return ok({
            "msg_today": msg_today,
            "active_users": active_users,
            "deleted_today": deleted_today,
            "errors": errors,
            "activity": activity,
            "events": events,
        })

    # --- АВТООТВЕТЫ ---
    if path == "/autoresponses":
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

    if path.startswith("/autoresponses/"):
        rid = path.split("/")[-1]
        if method == "PUT":
            body = json.loads(event.get("body") or "{}")
            if "active" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET active=%s WHERE id=%s", (body["active"], rid))
            if "trigger" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET trigger=%s WHERE id=%s", (body["trigger"], rid))
            if "response" in body:
                cur.execute(f"UPDATE {SCHEMA}.autoresponses SET response=%s WHERE id=%s", (body["response"], rid))
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

        if method == "DELETE":
            cur.execute(f"UPDATE {SCHEMA}.autoresponses SET active=FALSE WHERE id=%s", (rid,))
            conn.commit(); cur.close(); conn.close()
            return ok({"ok": True})

    # --- СООБЩЕНИЯ ---
    if path == "/messages" and method == "GET":
        event_filter = params.get("filter", "all")
        if event_filter == "deleted":
            where = "WHERE event_type='deleted'"
        elif event_filter == "edited":
            where = "WHERE event_type='edited'"
        else:
            where = "WHERE event_type IN ('deleted','edited')"

        cur.execute(f"""
            SELECT id, username, first_name, text, original_text, event_type, created_at
            FROM {SCHEMA}.messages
            {where}
            ORDER BY created_at DESC LIMIT 50
        """)
        rows = []
        for r in cur.fetchall():
            display = r[3] or ""
            if r[4]:
                display = f"{r[4]} → {r[3]}"
            rows.append({
                "id": r[0],
                "user": f"@{r[1]}" if r[1] else (r[2] or "Аноним"),
                "text": display[:120],
                "type": r[5],
                "time": r[6],
            })
        cur.close(); conn.close()
        return ok(rows)

    # --- НАСТРОЙКИ ---
    if path == "/settings":
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
    if path == "/setup-webhook" and method == "POST":
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
    if path == "/bot-info" and method == "GET":
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        tg_url = f"https://api.telegram.org/bot{token}/getMe"
        req = urllib.request.Request(tg_url)
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        cur.close(); conn.close()
        return ok(result)

    cur.close(); conn.close()
    return err("not found", 404)
