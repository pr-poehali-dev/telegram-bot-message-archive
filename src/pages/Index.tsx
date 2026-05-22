import { useState } from "react";
import Icon from "@/components/ui/icon";

type Tab = "dashboard" | "autoresponse" | "messages" | "admin";

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "dashboard", label: "Обзор", icon: "LayoutDashboard" },
  { id: "autoresponse", label: "Автоответы", icon: "MessageSquareReply" },
  { id: "messages", label: "Сообщения", icon: "Eye" },
  { id: "admin", label: "Настройки", icon: "Settings2" },
];

const MOCK_STATS = [
  { label: "Сообщений сегодня", value: "1 247", delta: "+12%", icon: "MessageCircle", color: "blue" },
  { label: "Активных пользователей", value: "348", delta: "+5%", icon: "Users", color: "green" },
  { label: "Удалённых сообщений", value: "23", delta: "−3%", icon: "Trash2", color: "amber" },
  { label: "Ошибок бота", value: "0", delta: "чисто", icon: "ShieldCheck", color: "green" },
];

const MOCK_RESPONSES = [
  { id: 1, trigger: "/start", type: "command", response: "Привет! Я твой бот. Введи /help для списка команд.", active: true },
  { id: 2, trigger: "/help", type: "command", response: "Список доступных команд: /start, /help, /info, /status", active: true },
  { id: 3, trigger: "цена", type: "keyword", response: "Для уточнения цены напишите нам в @support", active: true },
  { id: 4, trigger: "скидка", type: "keyword", response: "Актуальные скидки на нашем сайте!", active: false },
  { id: 5, trigger: "/status", type: "command", response: "Бот работает штатно ✅", active: true },
];

const MOCK_DELETED = [
  { id: 1, user: "@alexkuznetsov", text: "Это сообщение было удалено", time: "14:32", type: "deleted" },
  { id: 2, user: "@maria_ivanova", text: "Привет → Привет, как дела?", time: "13:58", type: "edited" },
  { id: 3, user: "@test_user99", text: "Нехорошее слово", time: "12:10", type: "deleted" },
  { id: 4, user: "@alexkuznetsov", text: "Ок → Окей, понял тебя", time: "11:44", type: "edited" },
  { id: 5, user: "@new_member_42", text: "Первое сообщение было удалено", time: "10:03", type: "deleted" },
];

const colorMap: Record<string, string> = {
  blue: "text-blue-400",
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

const bgMap: Record<string, string> = {
  blue: "bg-blue-400/10",
  green: "bg-emerald-400/10",
  amber: "bg-amber-400/10",
  red: "bg-red-400/10",
};

function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {MOCK_STATS.map((s, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground tracking-wide uppercase">{s.label}</span>
              <div className={`w-7 h-7 rounded-md flex items-center justify-center ${bgMap[s.color]}`}>
                <Icon name={s.icon} size={14} className={colorMap[s.color]} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-semibold tracking-tight">{s.value}</span>
              <span className={`text-xs font-mono-tg ${s.delta.startsWith("+") || s.delta === "чисто" ? "text-emerald-400" : "text-muted-foreground"}`}>
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">Активность бота</span>
          <div className="flex items-center gap-1.5">
            <span className="status-dot bg-emerald-400"></span>
            <span className="text-xs text-muted-foreground">онлайн</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-1 h-16">
            {[4, 7, 5, 9, 12, 8, 15, 11, 6, 14, 10, 13, 9, 7, 11, 16, 8, 12, 5, 10, 13, 7, 9, 14].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-blue-400/20 hover:bg-blue-400/40 transition-colors cursor-default"
                style={{ height: `${(v / 16) * 100}%` }}
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
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Последние события</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { icon: "UserPlus", color: "green", text: "@new_user вступил в чат", time: "только что" },
            { icon: "Trash2", color: "amber", text: "@alexkuznetsov удалил сообщение", time: "2 мин" },
            { icon: "MessageSquareReply", color: "blue", text: "Автоответ на /start сработал", time: "5 мин" },
            { icon: "Edit3", color: "amber", text: "@maria_ivanova изменила сообщение", time: "11 мин" },
          ].map((e, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${bgMap[e.color]}`}>
                <Icon name={e.icon} size={12} className={colorMap[e.color]} />
              </div>
              <span className="text-sm text-foreground flex-1">{e.text}</span>
              <span className="text-xs text-muted-foreground font-mono-tg">{e.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutoResponse() {
  const [responses, setResponses] = useState(MOCK_RESPONSES);
  const [newTrigger, setNewTrigger] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [newType, setNewType] = useState<"command" | "keyword">("command");
  const [showForm, setShowForm] = useState(false);

  const toggle = (id: number) => {
    setResponses(r => r.map(x => x.id === id ? { ...x, active: !x.active } : x));
  };

  const remove = (id: number) => {
    setResponses(r => r.filter(x => x.id !== id));
  };

  const add = () => {
    if (!newTrigger.trim() || !newResponse.trim()) return;
    setResponses(r => [...r, {
      id: Date.now(), trigger: newTrigger.trim(),
      type: newType, response: newResponse.trim(), active: true,
    }]);
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
          {responses.map(r => (
            <div key={r.id} className={`flex items-start gap-3 px-4 py-3 transition-opacity ${!r.active ? "opacity-50" : ""}`}>
              <button onClick={() => toggle(r.id)} className="mt-0.5 flex-shrink-0">
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
  const filtered = MOCK_DELETED.filter(m => filter === "all" ? true : m.type === filter);

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
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Нет сообщений</div>
          )}
          {filtered.map(m => (
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
              <span className="text-xs text-muted-foreground font-mono-tg flex-shrink-0">{m.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 flex items-start gap-3">
        <Icon name="Info" size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Для просмотра реальных удалённых сообщений бот должен быть администратором группы и иметь соответствующие разрешения.
        </p>
      </div>
    </div>
  );
}

function Admin() {
  const [botToken, setBotToken] = useState("7894512345:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [botName, setBotName] = useState("@my_awesome_bot");
  const [logChannel, setLogChannel] = useState("-100123456789");
  const [spamFilter, setSpamFilter] = useState(true);
  const [deleteLog, setDeleteLog] = useState(true);
  const [editLog, setEditLog] = useState(true);
  const [joinLog, setJoinLog] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}>
      <div
        className={`relative rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}
        style={{ width: "36px", height: "20px" }}
      >
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
          <span className="text-sm font-medium">Подключение</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Bot Token</label>
            <div className="relative">
              <input
                type="password"
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono-tg outline-none focus:border-primary/60 pr-10"
              />
              <Icon name="Lock" size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Username бота</label>
            <input
              value={botName}
              onChange={e => setBotName(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono-tg outline-none focus:border-primary/60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">ID канала для логов</label>
            <input
              value={logChannel}
              onChange={e => setLogChannel(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono-tg outline-none focus:border-primary/60"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <span className="text-sm font-medium">Функции мониторинга</span>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Лог удалённых сообщений", desc: "Записывать удалённые сообщения", value: deleteLog, onChange: () => setDeleteLog(!deleteLog) },
            { label: "Лог изменённых сообщений", desc: "Фиксировать оригинальный текст", value: editLog, onChange: () => setEditLog(!editLog) },
            { label: "Лог входа/выхода", desc: "Отслеживать вступление участников", value: joinLog, onChange: () => setJoinLog(!joinLog) },
            { label: "Анти-спам фильтр", desc: "Автоматическое удаление спама", value: spamFilter, onChange: () => setSpamFilter(!spamFilter) },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {saved ? <Icon name="Check" size={14} /> : <Icon name="Save" size={14} />}
          {saved ? "Сохранено!" : "Сохранить настройки"}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors">
          <Icon name="RefreshCw" size={14} />
          Тест соединения
        </button>
      </div>
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
            <span className="status-dot bg-emerald-400 flex-shrink-0"></span>
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
