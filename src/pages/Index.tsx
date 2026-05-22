import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/043c5a49-b96e-4d3b-96c1-e155e1dd6457";
const WEBHOOK_URL = "https://functions.poehali.dev/96ea724e-4886-467e-96d7-aeb5c523a935";

type Tab = "dashboard" | "autoresponse" | "messages" | "admin";

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "autoresponse", label: "Автоответы", icon: "MessageSquareReply" },
  { id: "messages", label: "Сообщения", icon: "Eye" },
  { id: "admin", label: "Настройки", icon: "Settings2" },
];

const colorMap: Record<string, string> = {
  blue: "text-blue-400", green: "text-emerald-400",
  amber: "text-amber-400", red: "text-red-400",
};
const bgMap: Record<string, string> = {
  blue: "bg-blue-400/10", green: "bg-emerald-400/10",
  amber: "bg-amber-400/10", red: "bg-red-400/10",
};

async function apiFetch(action: string, options?: RequestInit, extra?: string) {
  const qs = extra ? `?action=${action}&${extra}` : `?action=${action}`;
  const res = await fetch(`${API}${qs}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json();
}

function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("stats");
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = stats ? [
    { label: "Сообщений сегодня", value: stats.msg_today.toLocaleString("ru"), icon: "MessageCircle", color: "blue" },
    { label: "Активных пользователей", value: stats.active_users.toLocaleString("ru"), icon: "Users", color: "green" },
    { label: "Удалённых сообщений", value: stats.deleted_today.toLocaleString("ru"), icon: "Trash2", color: "amber" },
    { label: "Ошибок бота", value: "0", icon: "ShieldCheck", color: "green" },
  ] : Array(4).fill(null);

  const activity: number[] = stats?.activity || Array(24).fill(0);
  const maxVal = Math.max(...activity, 1);

  const eventIcon: Record<string, { icon: string; color: string; label: string }> = {
    message: { icon: "MessageCircle", color: "blue", label: "написал" },
    deleted: { icon: "Trash2", color: "amber", label: "удалил сообщение" },
    edited: { icon: "Edit3", color: "amber", label: "изменил сообщение" },
    join: { icon: "UserPlus", color: "green", label: "вступил в чат" },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            {loading || !s ? (
              <>
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
                <div className="h-7 w-16 bg-secondary rounded animate-pulse" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground tracking-wide uppercase">{s.label}</span>
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${bgMap[s.color]}`}>
                    <Icon name={s.icon} size={14} className={colorMap[s.color]} />
                  </div>
                </div>
                <span className="text-2xl font-semibold tracking-tight">{s.value}</span>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">Активность за 24 часа</span>
          <div className="flex items-center gap-1.5">
            <span className="status-dot bg-emerald-400" />
            <span className="text-xs text-muted-foreground">онлайн</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-1 h-16">
            {activity.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-blue-400/20 hover:bg-blue-400/40 transition-colors cursor-default"
                style={{ height: `${(v / maxVal) * 100}%`, minHeight: "2px" }}
                title={`${String(i).padStart(2, "0")}:00 — ${v} сообщений`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">00:00</span>
            <span className="text-xs text-muted-foreground">12:00</span>
            <span className="text-xs text-muted-foreground">сейчас</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">Последние события</span>
          <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="RefreshCw" size={13} />
          </button>
        </div>
        <div className="divide-y divide-border">
          {loading && Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-6 h-6 bg-secondary rounded animate-pulse" />
              <div className="flex-1 h-3 bg-secondary rounded animate-pulse" />
            </div>
          ))}
          {!loading && (!stats?.events || stats.events.length === 0) && (
            <div className="py-8 text-center text-sm text-muted-foreground">Событий пока нет — напиши боту что-нибудь!</div>
          )}
          {!loading && stats?.events?.map((e: any, i: number) => {
            const meta = eventIcon[e.type] || eventIcon.message;
            const user = e.username ? `@${e.username}` : (e.first_name || "Аноним");
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${bgMap[meta.color]}`}>
                  <Icon name={meta.icon} size={12} className={colorMap[meta.color]} />
                </div>
                <span className="text-sm text-foreground flex-1 truncate">
                  <span className="text-blue-400 font-mono-tg">{user}</span> {meta.label}
                  {e.text ? `: ${e.text.slice(0, 40)}` : ""}
                </span>
                <span className="text-xs text-muted-foreground font-mono-tg flex-shrink-0">
                  {new Date(e.time).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Autoresponse {
  id: number; trigger: string; response: string; type: string; active: boolean;
}

function AutoResponse() {
  const [responses, setResponses] = useState<Autoresponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [newType, setNewType] = useState<"command" | "keyword">("command");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    apiFetch("autoresponses").then(data => {
      if (Array.isArray(data)) setResponses(data);
      setLoading(false);
    });
  }, []);

  const toggle = async (item: Autoresponse) => {
    setResponses(r => r.map(x => x.id === item.id ? { ...x, active: !x.active } : x));
    await apiFetch("autoresponses", {
      method: "PUT",
      body: JSON.stringify({ active: !item.active }),
    }, `id=${item.id}`);
  };

  const remove = async (id: number) => {
    setResponses(r => r.filter(x => x.id !== id));
    await apiFetch("autoresponses", { method: "DELETE" }, `id=${id}`);
  };

  const add = async () => {
    if (!newTrigger.trim() || !newResponse.trim()) return;
    const data = await apiFetch("autoresponses", {
      method: "POST",
      body: JSON.stringify({ trigger: newTrigger.trim(), response: newResponse.trim(), type: newType }),
    });
    if (data.id) setResponses(r => [...r, data]);
    setNewTrigger(""); setNewResponse(""); setShowForm(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Автоответы</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Команды и ключевые слова</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Icon name="Plus" size={14} />
          Добавить
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-blue-400/30 bg-blue-400/5 p-4 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Тип</label>
              <div className="flex rounded-md overflow-hidden border border-border">
                {(["command", "keyword"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${newType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t === "command" ? "Команда" : "Ключ. слово"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Триггер</label>
              <input
                value={newTrigger}
                onChange={e => setNewTrigger(e.target.value)}
                placeholder={newType === "command" ? "/команда" : "слово"}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm font-mono-tg placeholder:text-muted-foreground/50 outline-none focus:border-primary/60"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Ответ бота</label>
            <textarea
              value={newResponse}
              onChange={e => setNewResponse(e.target.value)}
              placeholder="Текст, который отправит бот..."
              rows={2}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">Сохранить</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors">Отмена</button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {loading && Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-5 bg-secondary rounded-full animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-2.5 w-48 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
          {!loading && responses.map(r => (
            <div key={r.id} className={`flex items-start gap-3 px-4 py-3 transition-opacity ${!r.active ? "opacity-50" : ""}`}>
              <button onClick={() => toggle(r)} className="mt-0.5 flex-shrink-0">
                <div
                  className={`relative rounded-full transition-colors ${r.active ? "bg-primary" : "bg-border"}`}
                  style={{ height: "18px", width: "32px" }}
                >
                  <div className={`absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${r.active ? "translate-x-[14px]" : "translate-x-[2px]"}`} />
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-mono-tg ${r.type === "command" ? "bg-blue-400/10 text-blue-400" : "bg-amber-400/10 text-amber-400"}`}>
                    {r.type === "command" ? "CMD" : "KEY"}
                  </span>
                  <span className="text-sm font-mono-tg font-medium">{r.trigger}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{r.response}</p>
              </div>
              <button onClick={() => remove(r.id)} className="flex-shrink-0 text-muted-foreground hover:text-red-400 transition-colors mt-0.5">
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Messages() {
  const [filter, setFilter] = useState<"all" | "deleted" | "edited">("all");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch("messages", undefined, `filter=${filter}`).then(data => {
      if (Array.isArray(data)) setMessages(data);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-base font-medium">Удалённые и изменённые</h2>
        <p className="text-sm text-muted-foreground mt-0.5">История скрытых сообщений чата</p>
      </div>

      <div className="flex gap-1 p-1 bg-secondary rounded-lg w-fit">
        {[
          { id: "all", label: "Все" },
          { id: "deleted", label: "Удалённые" },
          { id: "edited", label: "Изменённые" },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as typeof filter)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {loading && Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-6 h-6 bg-secondary rounded-full animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-48 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
          {!loading && messages.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет сообщений</div>
          )}
          {!loading && messages.map(m => (
            <div key={m.id} className="flex items-start gap-3 px-4 py-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${m.type === "deleted" ? "bg-red-400/10" : "bg-amber-400/10"}`}>
                <Icon
                  name={m.type === "deleted" ? "Trash2" : "Edit3"}
                  size={12}
                  className={m.type === "deleted" ? "text-red-400" : "text-amber-400"}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono-tg text-blue-400">{m.user}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${m.type === "deleted" ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400"}`}>
                    {m.type === "deleted" ? "удалено" : "изменено"}
                  </span>
                </div>
                <p className="text-sm text-foreground">{m.text}</p>
              </div>
              <span className="text-xs text-muted-foreground font-mono-tg flex-shrink-0">
                {new Date(m.time).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex items-start gap-3">
        <Icon name="Info" size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Telegram не уведомляет о факте удаления сообщений через webhook. Изменённые сообщения фиксируются автоматически.
        </p>
      </div>
    </div>
  );
}

function Admin() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "setting" | "done" | "error">("idle");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("settings"),
      apiFetch("bot-info"),
    ]).then(([s, b]) => {
      if (s && !s.error) setSettings(s);
      if (b?.result) setBotInfo(b.result);
      setLoading(false);
    });
  }, []);

  const toggleSetting = (key: string) => {
    const newVal = settings[key] === "true" ? "false" : "true";
    setSettings(s => ({ ...s, [key]: newVal }));
  };

  const save = async () => {
    await apiFetch("settings", { method: "PUT", body: JSON.stringify(settings) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setupWebhook = async () => {
    setWebhookStatus("setting");
    const result = await apiFetch("setup-webhook", {
      method: "POST",
      body: JSON.stringify({ webhook_url: WEBHOOK_URL }),
    });
    setWebhookStatus(result.ok ? "done" : "error");
    setTimeout(() => setWebhookStatus("idle"), 3000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}>
      <div className={`relative rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}
        style={{ width: "36px", height: "20px" }}>
        <div className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${value ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
      </div>
    </button>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-base font-medium">Настройки бота</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Конфигурация и параметры</p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Информация о боте</span>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
                <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ) : botInfo ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="Bot" size={18} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">{botInfo.first_name}</div>
                <div className="text-xs text-muted-foreground font-mono-tg">@{botInfo.username}</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="status-dot bg-emerald-400" />
                <span className="text-xs text-emerald-400">подключён</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-red-400">Не удалось получить данные бота. Проверьте токен.</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Webhook — приём сообщений</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Нажми кнопку, чтобы Telegram начал отправлять все сообщения боту. Это нужно сделать один раз.
          </p>
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-secondary">
            <Icon name="Link" size={12} className="text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-mono-tg text-muted-foreground truncate">{WEBHOOK_URL}</span>
          </div>
          <button
            onClick={setupWebhook}
            disabled={webhookStatus === "setting"}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              webhookStatus === "done" ? "bg-emerald-400/10 text-emerald-400" :
              webhookStatus === "error" ? "bg-red-400/10 text-red-400" :
              "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Icon
              name={webhookStatus === "setting" ? "Loader2" : webhookStatus === "done" ? "CheckCircle" : "Zap"}
              size={14}
              className={webhookStatus === "setting" ? "animate-spin" : ""}
            />
            {webhookStatus === "idle" && "Активировать webhook"}
            {webhookStatus === "setting" && "Настраиваю..."}
            {webhookStatus === "done" && "Webhook активен!"}
            {webhookStatus === "error" && "Ошибка, попробуй снова"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Функции мониторинга</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { key: "delete_log", label: "Лог удалённых сообщений", desc: "Записывать удалённые сообщения" },
            { key: "edit_log", label: "Лог изменённых сообщений", desc: "Фиксировать оригинальный текст" },
            { key: "join_log", label: "Лог входа/выхода", desc: "Отслеживать вступление участников" },
            { key: "spam_filter", label: "Анти-спам фильтр", desc: "Автоматическое удаление спама" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Toggle value={settings[item.key] === "true"} onChange={() => toggleSetting(item.key)} />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        {saved ? <Icon name="Check" size={14} /> : <Icon name="Save" size={14} />}
        {saved ? "Сохранено!" : "Сохранить настройки"}
      </button>
    </div>
  );
}

export default function Index() {
  const [tab, setTab] = useState<Tab>("dashboard");

  const renderContent = () => {
    switch (tab) {
      case "dashboard": return <Dashboard />;
      case "autoresponse": return <AutoResponse />;
      case "messages": return <Messages />;
      case "admin": return <Admin />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-56 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <Icon name="Bot" size={15} className="text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">TeleAdmin</div>
              <div className="text-[10px] text-muted-foreground font-mono-tg">v1.0.0</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                tab === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-emerald-400/5 border border-emerald-400/20">
            <span className="status-dot bg-emerald-400 flex-shrink-0" />
            <span className="text-xs text-emerald-400">Бот активен</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {NAV_ITEMS.find(n => n.id === tab)?.label}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono-tg">
              <Icon name="Clock" size={12} />
              {new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
              <Icon name="User" size={13} className="text-muted-foreground" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}