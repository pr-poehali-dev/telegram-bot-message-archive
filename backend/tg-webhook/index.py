import json
import os
import psycopg2
import urllib.request


SCHEMA = "t_p21283616_telegram_bot_message"


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def send_message(chat_id: int, text: str):
    token = os.environ["TELEGRAM_BOT_TOKEN"]
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({"chat_id": chat_id, "text": text}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=5)


def ensure_seeded(cur):
    """Заполняем начальные данные если таблицы пустые."""
    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.autoresponses")
    if cur.fetchone()[0] == 0:
        defaults = [
            ("/start", "Привет! Я твой бот. Введи /help для списка команд.", "command", True),
            ("/help", "Список доступных команд: /start, /help, /status", "command", True),
            ("цена", "Для уточнения цены напишите нам в @support", "keyword", True),
            ("/status", "Бот работает штатно ✅", "command", True),
        ]
        for trigger, response, rtype, active in defaults:
            cur.execute(
                f"INSERT INTO {SCHEMA}.autoresponses (trigger, response, type, active) VALUES (%s, %s, %s, %s)",
                (trigger, response, rtype, active)
            )

    cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.settings")
    if cur.fetchone()[0] == 0:
        defaults = [
            ("delete_log", "true"),
            ("edit_log", "true"),
            ("join_log", "false"),
            ("spam_filter", "true"),
            ("log_channel", ""),
        ]
        for key, value in defaults:
            cur.execute(f"INSERT INTO {SCHEMA}.settings (key, value) VALUES (%s, %s)", (key, value))


def handler(event: dict, context) -> dict:
    """Webhook для приёма обновлений от Telegram."""
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    headers = {"Access-Control-Allow-Origin": "*"}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "bad json"})}

    conn = get_db()
    cur = conn.cursor()
    ensure_seeded(cur)

    # Получаем настройки
    cur.execute(f"SELECT key, value FROM {SCHEMA}.settings")
    settings = {row[0]: row[1] for row in cur.fetchall()}
    delete_log = settings.get("delete_log", "true") == "true"
    edit_log = settings.get("edit_log", "true") == "true"
    join_log = settings.get("join_log", "false") == "true"

    # Обработка обычного сообщения
    if "message" in body:
        msg = body["message"]
        chat_id = msg["chat"]["id"]
        user_id = msg.get("from", {}).get("id")
        username = msg.get("from", {}).get("username", "")
        first_name = msg.get("from", {}).get("first_name", "")
        text = msg.get("text", "")
        message_id = msg.get("message_id")

        # Сохраняем сообщение
        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (message_id, chat_id, user_id, username, first_name, text, event_type) VALUES (%s, %s, %s, %s, %s, %s, 'message')",
            (message_id, chat_id, user_id, username, first_name, text)
        )

        # Проверяем автоответы (сначала команды, затем ключевые слова)
        if text:
            cur.execute(
                f"SELECT trigger, response FROM {SCHEMA}.autoresponses WHERE active = TRUE ORDER BY CASE WHEN type='command' THEN 0 ELSE 1 END"
            )
            autoresponses = cur.fetchall()
            for trigger, response in autoresponses:
                if trigger.startswith("/"):
                    # Команда — точное совпадение с началом
                    if text.strip().lower().startswith(trigger.lower()):
                        send_message(chat_id, response)
                        break
                else:
                    # Ключевое слово — ищем в тексте
                    if trigger.lower() in text.lower():
                        send_message(chat_id, response)
                        break

        # Событие вступления
        if join_log and "new_chat_members" in msg:
            for member in msg["new_chat_members"]:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.messages (chat_id, user_id, username, first_name, text, event_type) VALUES (%s, %s, %s, %s, %s, 'join')",
                    (chat_id, member.get("id"), member.get("username", ""), member.get("first_name", ""), f"{member.get('first_name', '')} вступил в чат")
                )

    # Обработка удалённого сообщения (фиксируем через edited_message с пустым текстом — Telegram не даёт webhook на удаление напрямую)

    # Обработка изменённого сообщения
    if "edited_message" in body and edit_log:
        msg = body["edited_message"]
        chat_id = msg["chat"]["id"]
        user_id = msg.get("from", {}).get("id")
        username = msg.get("from", {}).get("username", "")
        first_name = msg.get("from", {}).get("first_name", "")
        new_text = msg.get("text", "")
        message_id = msg.get("message_id")

        # Находим оригинал
        cur.execute(
            f"SELECT text FROM {SCHEMA}.messages WHERE message_id = %s AND chat_id = %s ORDER BY created_at ASC LIMIT 1",
            (message_id, chat_id)
        )
        row = cur.fetchone()
        original = row[0] if row else None

        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (message_id, chat_id, user_id, username, first_name, text, event_type, original_text) VALUES (%s, %s, %s, %s, %s, %s, 'edited', %s)",
            (message_id, chat_id, user_id, username, first_name, new_text, original)
        )

    conn.commit()
    cur.close()
    conn.close()

    return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}
