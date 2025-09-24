const MOD = "spectator-mode";

/** Simple config app to pick spectators via checkboxes */
class SpectatorConfigApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "spectator-config",
      title: "Spectator Mode: Pick Users",
      template: "modules/spectator-mode/templates/spectator-config.hbs",
      width: 420,
      height: "auto",
      closeOnSubmit: true
    });
  }
  async getData() {
    const current = new Set(game.settings.get(MOD, "spectators") ?? []);
    const users = game.users.contents
      .sort((a,b)=>a.name.localeCompare(b.name))
      .map(u => ({
        id: u.id,
        name: u.name,
        checked: current.has(u.id)
      }));
    return { users };
  }
  async _updateObject(_event, formData) {
    if (!game.user.isGM) return ui.notifications.warn("GM only.");
    // formData has keys like users.<id>=on
    const ids = [];
    for (const [k,v] of Object.entries(formData)) {
      if (!k.startsWith("user.")) continue;
      const id = k.slice(5);
      if (v) ids.push(id);
    }
    await game.settings.set(MOD, "spectators", ids);
    ui.notifications.info(`Spectators updated (${ids.length})`);
  }
}

Hooks.once("init", () => {
  // Store as array of user ids, hidden from default config (use our custom form)
  game.settings.register(MOD, "spectators", {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  // Adds a nice button in Configure Settings -> Module Settings
  game.settings.registerMenu(MOD, "spectatorMenu", {
    name: "Spectator Users",
    label: "Configure Spectators",
    hint: "Choose which users are limited to board + chat only.",
    icon: "fas fa-user-slash",
    type: SpectatorConfigApp,
    restricted: true
  });

  // Chat command: /spectator @Name on|off
  Hooks.on("chatMessage", (chatLog, message, chatData) => {
    if (!game.user.isGM) return false;
    const m = message.trim();
    if (!m.startsWith("/spectator")) return false;

    const [, target, state] = m.split(/\s+/);
    if (!target || !state) {
      ui.notifications.info('Usage: /spectator @User on|off');
      return true;
    }
    const uname = target.replace(/^@/, "");
    const user = game.users.find(u => u.name === uname);
    if (!user) {
      ui.notifications.error(`User "${uname}" not found`);
      return true;
    }
    const list = Array.from(game.settings.get(MOD, "spectators") ?? []);
    const wantOn = /^(on|true|1|yes)$/i.test(state);
    const idx = list.indexOf(user.id);

    if (wantOn && idx === -1) list.push(user.id);
    if (!wantOn && idx !== -1) list.splice(idx, 1);

    game.settings.set(MOD, "spectators", list).then(() => {
      ChatMessage.create({
        content: `Spectator ${wantOn ? "ENABLED" : "DISABLED"} for <b>${user.name}</b>.`,
        whisper: [game.user.id]
      });
    });
    return true;
  });
});

Hooks.once("ready", () => {
  const spectators = new Set(game.settings.get(MOD, "spectators") ?? []);
  const isSpectator = spectators.has(game.user.id);

  // Expose API for macros
  const mod = game.modules.get(MOD);
  if (mod) {
    mod.api = {
      set: async (userId, enabled) => {
        if (!game.user.isGM) return ui.notifications.warn("GM only.");
        const list = Array.from(game.settings.get(MOD, "spectators") ?? []);
        const idx = list.indexOf(userId);
        if (enabled && idx === -1) list.push(userId);
        if (!enabled && idx !== -1) list.splice(idx, 1);
        return game.settings.set(MOD, "spectators", list);
      }
    };
  }

  if (!isSpectator) return;

  // Flag the DOM
  document.documentElement.classList.add("svtt-spectator");

  // Hide left controls & hotbar immediately on load
  try { ui.controls?.render(false); } catch (_) {}
  try { ui.hotbar?.render(false); } catch (_) {}

  // Sidebar: lock to Chat only
  const sidebar = ui.sidebar;
  if (sidebar) {
    sidebar.activateTab?.("chat");
    for (const [tab, app] of Object.entries(sidebar.tabs)) {
      if (tab !== "chat") {
        const btn = sidebar._tabs?.nav.find(`[data-tab="${tab}"]`);
        btn?.addClass?.("svtt-hidden");
        app?.element?.addClass?.("svtt-hidden");
      }
    }
  }

  // Keep scene controls hidden every time they render
  Hooks.on("renderSceneControls", (_app, html) => {
    html?.closest?.("#controls")?.classList?.add("svtt-hidden");
  });

  // Block global hotkeys unless typing in chat / inputs
  const shouldAllow = (ev) => {
    const el = ev.target;
    if (!el) return false;
    if (el.closest?.("#chat-form")) return true;
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return true;
    return false;
  };
  const swallow = (ev) => {
    if (!shouldAllow(ev)) {
      ev.stopImmediatePropagation();
      ev.stopPropagation();
      ev.preventDefault();
    }
  };
  window.addEventListener("keydown", swallow, true);
  window.addEventListener("keyup", swallow, true);
  window.addEventListener("keypress", swallow, true);

  ui.notifications.info("Spectator mode active: board + chat only.");
});
