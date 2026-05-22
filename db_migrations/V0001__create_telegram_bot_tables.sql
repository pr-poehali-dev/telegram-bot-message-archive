CREATE TABLE IF NOT EXISTS t_p21283616_telegram_bot_message.messages (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT,
    chat_id BIGINT NOT NULL,
    user_id BIGINT,
    username TEXT,
    first_name TEXT,
    text TEXT,
    event_type TEXT NOT NULL DEFAULT 'message',
    original_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p21283616_telegram_bot_message.autoresponses (
    id BIGSERIAL PRIMARY KEY,
    trigger TEXT NOT NULL UNIQUE,
    response TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'keyword',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p21283616_telegram_bot_message.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
