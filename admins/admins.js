(() => {
  const STORAGE_KEY = "atc_site_content";
  const AUTH_KEY = "atc_admin_ok";
  const CHANNEL_NAME = "atc_content_sync";
  const DEFAULT_PASSWORD = "atcadmin2024";
  const syncChannel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const panelsEl = document.getElementById("panels");
  const navEl = document.getElementById("section-nav");
  const panelTitle = document.getElementById("panel-title");
  const saveBtn = document.getElementById("save-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const toast = document.getElementById("toast");

  let content = null;
  let activeKey = "hero";
  let useApi = false;

  const THEMES = [
    { id: "violet", label: "Violet", desc: "Noir, blanc, gris & violet (actuel)" },
    { id: "ocean", label: "Océan", desc: "Bleu nuit & teal" },
    { id: "copper", label: "Cuivre", desc: "Charbon & cuivre chaud" },
    { id: "forest", label: "Forêt", desc: "Vert profond & gris" },
    { id: "graphite", label: "Graphite", desc: "Noir, blanc & acier" },
  ];

  const sections = [
    { key: "theme", label: "Thème" },
    { key: "hero", label: "Hero" },
    { key: "about", label: "La société" },
    { key: "credibility", label: "Crédibilité" },
    { key: "letter", label: "Mot du DG" },
    { key: "direction", label: "Direction" },
    { key: "sectors", label: "Secteurs" },
    { key: "prestations", label: "Méthode" },
    { key: "audience", label: "Pour qui" },
    { key: "proof", label: "Références" },
    { key: "contact", label: "Contact" },
  ];

  const blanks = {
    "about.images": {
      image: "assets/images/voirie.jpg",
      alt: "Photo",
    },
    "credibility.items": { label: "Label", value: "Valeur" },
    "direction.people": { role: "Fonction", name: "Nom", bio: "", image: "" },
    "sectors.items": {
      label: "Nouveau secteur",
      title: "Titre",
      text: "",
      alt: "",
      image: "assets/images/intro-infra.jpg",
    },
    "prestations.phases": { tag: "Phase", title: "Titre", items: ["Point 1"] },
    "audience.items": { title: "Profil", text: "" },
    "proof.items": { name: "Client", alt: "", image: "" },
    "contact.paths": {
      label: "Sujet",
      href: "mailto:info.atcprojects@gmail.com?subject=Contact",
    },
  };

  const showToast = (msg, isError = false) => {
    toast.hidden = false;
    toast.textContent = msg;
    toast.classList.toggle("is-error", isError);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  };

  const getByPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

  const setByPath = (obj, path, value) => {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  };

  const loadContent = async () => {
    try {
      const res = await fetch("/api/content", { cache: "no-store", credentials: "same-origin" });
      if (res.ok) {
        useApi = true;
        return res.json();
      }
    } catch (_) {}

    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        return JSON.parse(local);
      } catch (_) {}
    }
    const res = await fetch("/data/content.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load content");
    return res.json();
  };

  const isListPath = (path) =>
    path === "values.items" ||
    path === "contact.emails" ||
    /prestations\.phases\.\d+\.items$/.test(path);

  const harvestFields = () => {
    panelsEl.querySelectorAll("[data-path]").forEach((input) => {
      const path = input.getAttribute("data-path");
      if (!path) return;
      /* skip truncated data-URL previews */
      if (input.value.includes("…") && String(getByPath(content, path) || "").startsWith("data:")) {
        return;
      }
      if (isListPath(path)) {
        setByPath(
          content,
          path,
          input.value.split("\n").map((s) => s.trim()).filter(Boolean)
        );
      } else {
        setByPath(content, path, input.value);
      }
    });
  };

  const saveContent = async () => {
    harvestFields();
    const payload = JSON.stringify(content);
    localStorage.setItem(STORAGE_KEY, payload);
    localStorage.setItem(`${STORAGE_KEY}_updated`, String(Date.now()));
    try {
      syncChannel?.postMessage({ type: "content", data: content });
    } catch (_) {}

    if (useApi) {
      const res = await fetch("/api/content", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed — login again");
      return { mode: "server" };
    }
    return { mode: "local" };
  };

  const visibilityToggle = (sectionKey) => {
    const visible = content[sectionKey]?.visible !== false;
    return `
      <label class="admins-visibility">
        <input type="checkbox" data-visible="${sectionKey}.visible" ${visible ? "checked" : ""} />
        <span>Afficher cette section sur le site</span>
      </label>`;
  };

  const field = (label, path, multiline = false) => {
    const id = path.replace(/\W/g, "-");
    const tag = multiline ? "textarea" : "input";
    return `<div class="admins-field"><label for="${id}">${label}</label><${tag} id="${id}" data-path="${path}"></${tag}></div>`;
  };

  const imageField = (label, path) => `
    <div class="admins-field admins-media">
      <label>${label}</label>
      <img src="" alt="" data-preview="${path}" hidden />
      <input type="text" data-path="${path}" placeholder="Chemin image (vide = pas de photo)" />
      <div class="admins-media__actions">
        <label class="admins-file-btn">
          Changer
          <input type="file" accept="image/*" data-upload="${path}" hidden />
        </label>
        <button type="button" class="btn btn--ghost" data-clear-image="${path}">Supprimer</button>
      </div>
    </div>`;

  const listEditor = (title, path, itemFields, emptyHint = "Aucun élément.") => {
    if (!Array.isArray(getByPath(content, path))) setByPath(content, path, []);
    const items = getByPath(content, path) || [];
    return `
      <div class="admins-block">
        <div class="admins-item__head">
          <h3>${title}</h3>
          <button type="button" class="btn btn--primary" data-add="${path}">+ Ajouter</button>
        </div>
        ${
          !items.length
            ? `<div class="admins-empty">
                <p>${emptyHint}</p>
                <button type="button" class="btn btn--primary" data-add="${path}">+ Ajouter</button>
              </div>`
            : items
                .map((item, index) => {
                  const fields = itemFields
                    .map((f) =>
                      f.type === "image"
                        ? imageField(f.label, `${path}.${index}.${f.key}`)
                        : field(f.label, `${path}.${index}.${f.key}`, !!f.multiline)
                    )
                    .join("");
                  return `
              <div class="admins-item">
                <div class="admins-item__head">
                  <strong>#${index + 1}</strong>
                  <button type="button" class="btn btn--ghost" data-remove="${path}" data-index="${index}">Supprimer</button>
                </div>
                ${fields}
              </div>`;
                })
                .join("")
        }
      </div>`;
  };

  const panelHtml = {
    theme: () => {
      const current = content.theme || "violet";
      return `
      <div class="admins-block">
        <h3>Couleurs du site</h3>
        <p class="admins-muted">Choisissez un thème, puis Enregistrer. Les couleurs s’appliquent sur tout le site.</p>
        <div class="admins-themes">
          ${THEMES.map(
            (t) => `
            <label class="admins-theme ${t.id === current ? "is-active" : ""}" data-theme-card="${t.id}">
              <input type="radio" name="site-theme" value="${t.id}" ${t.id === current ? "checked" : ""} />
              <span class="admins-theme__swatch admins-theme__swatch--${t.id}" aria-hidden="true"></span>
              <span class="admins-theme__meta">
                <strong>${t.label}</strong>
                <span>${t.desc}</span>
              </span>
            </label>`
          ).join("")}
        </div>
      </div>`;
    },
    hero: () => `
      <div class="admins-block">
        <h3>Hero</h3>
        ${visibilityToggle("hero")}
        <div class="admins-row">${field("Marque", "hero.brand")}${field("Titre", "hero.title")}</div>
        ${field("Sous-texte", "hero.lead", true)}
        ${imageField("Image de fond", "hero.image")}
        <div class="admins-row">${field("CTA principal", "hero.ctaPrimary")}${field("Lien CTA principal", "hero.ctaPrimaryHref")}</div>
        <div class="admins-row">${field("CTA secondaire", "hero.ctaSecondary")}${field("Lien CTA secondaire", "hero.ctaSecondaryHref")}</div>
      </div>`,
    about: () => `
      <div class="admins-block">
        <h3>La société</h3>
        ${visibilityToggle("about")}
        <div class="admins-row">${field("Sur-titre", "about.kicker")}${field("Titre", "about.title")}</div>
        ${field("Accroche", "about.lead", true)}
        ${field("Paragraphe", "about.text", true)}
      </div>
      ${listEditor("Photos", "about.images", [
        { key: "image", label: "Photo", type: "image" },
        { key: "alt", label: "Texte alternatif" },
      ])}`,
    credibility: () => `
      <div class="admins-block">
        <h3>Crédibilité</h3>
        ${visibilityToggle("credibility")}
        <p class="admins-muted">Faits courts sous La société (siège, métier, secteurs…).</p>
      </div>
      ${listEditor("Faits", "credibility.items", [
        { key: "label", label: "Label" },
        { key: "value", label: "Valeur" },
      ])}`,
    letter: () => `
      <div class="admins-block">
        <h3>Mot du DG</h3>
        ${visibilityToggle("letter")}
        ${field("Sur-titre", "letter.kicker")}
        ${field("Citation", "letter.quote", true)}
        ${field("Paragraphe", "letter.p1", true)}
        <div class="admins-row">${field("Nom", "letter.name")}${field("Fonction", "letter.role")}</div>
      </div>`,
    direction: () => `
      <div class="admins-block">
        <h3>Direction</h3>
        ${visibilityToggle("direction")}
        <div class="admins-row">${field("Sur-titre", "direction.kicker")}${field("Titre", "direction.title")}</div>
      </div>
      ${listEditor("Membres", "direction.people", [
        { key: "role", label: "Fonction" },
        { key: "name", label: "Nom" },
        { key: "bio", label: "Bio courte", multiline: true },
        { key: "image", label: "Photo", type: "image" },
      ])}`,
    sectors: () => `
      <div class="admins-block">
        <h3>Secteurs</h3>
        ${visibilityToggle("sectors")}
        <div class="admins-row">${field("Sur-titre", "sectors.kicker")}${field("Titre", "sectors.title")}</div>
      </div>
      ${listEditor("Slides", "sectors.items", [
        { key: "label", label: "Label" },
        { key: "title", label: "Titre" },
        { key: "text", label: "Texte", multiline: true },
        { key: "alt", label: "Alt image" },
        { key: "image", label: "Image", type: "image" },
      ])}`,
    prestations: () => `
      <div class="admins-block">
        <h3>Méthode</h3>
        ${visibilityToggle("prestations")}
        <div class="admins-row">${field("Sur-titre", "prestations.kicker")}${field("Titre", "prestations.title")}</div>
      </div>
      ${listEditor("Phases", "prestations.phases", [
        { key: "tag", label: "Tag" },
        { key: "title", label: "Titre" },
        { key: "items", label: "Points (un par ligne)", multiline: true },
      ])}`,
    audience: () => `
      <div class="admins-block">
        <h3>Pour qui</h3>
        ${visibilityToggle("audience")}
        <div class="admins-row">${field("Sur-titre", "audience.kicker")}${field("Titre", "audience.title")}</div>
        ${imageField("Photo de fond", "audience.image")}
      </div>
      ${listEditor("Profils", "audience.items", [
        { key: "title", label: "Titre" },
        { key: "text", label: "Texte", multiline: true },
      ])}`,
    proof: () => `
      <div class="admins-block">
        <h3>Références — bandeau logos</h3>
        ${visibilityToggle("proof")}
        <p class="admins-muted">Cliquez « + Ajouter », uploadez un logo (PNG/SVG), puis Enregistrer. Les logos défilent en boucle sur le site.</p>
        <div class="admins-row">${field("Sur-titre", "proof.kicker")}${field("Titre", "proof.title")}</div>
      </div>
      ${listEditor(
        "Logos clients",
        "proof.items",
        [
          { key: "name", label: "Nom (interne)" },
          { key: "alt", label: "Texte alternatif" },
          { key: "image", label: "Logo", type: "image" },
        ],
        "Aucun logo. Ajoutez-en pour activer le bandeau."
      )}`,
    contact: () => `
      <div class="admins-block">
        <h3>Contact</h3>
        ${visibilityToggle("contact")}
        <div class="admins-row">${field("Sur-titre", "contact.kicker")}${field("Titre", "contact.title")}</div>
        ${field("Sous-texte", "contact.lead", true)}
        <div class="admins-row">${field("Téléphone", "contact.phone")}${field("Lien tel:", "contact.phoneHref")}</div>
        ${field("Lien WhatsApp", "contact.whatsappHref")}
        ${field("Emails (un par ligne)", "contact.emails", true)}
        ${field("Adresse", "contact.address", true)}
      </div>
      ${listEditor("Chemins CTA", "contact.paths", [
        { key: "label", label: "Label" },
        { key: "href", label: "Lien (mailto:…)" },
      ])}`,
  };

  const bindFields = () => {
    panelsEl.querySelectorAll("[data-path]").forEach((input) => {
      const path = input.getAttribute("data-path");
      const value = getByPath(content, path);
      input.value = Array.isArray(value) ? value.join("\n") : value ?? "";

      const preview = panelsEl.querySelector(`[data-preview="${path}"]`);
      if (preview) {
        if (typeof value === "string" && value) {
          preview.hidden = false;
          preview.src =
            value.startsWith("data:") || value.startsWith("/") || value.startsWith("http")
              ? value
              : `/${value}`;
        } else {
          preview.hidden = true;
          preview.removeAttribute("src");
        }
      }

      input.oninput = () => {
        const current = getByPath(content, path);
        if (path === "contact.emails" || (/prestations\.phases\.\d+\.items$/.test(path))) {
          setByPath(
            content,
            path,
            input.value.split("\n").map((s) => s.trim()).filter(Boolean)
          );
        } else if (Array.isArray(current)) {
          setByPath(
            content,
            path,
            input.value.split("\n").map((s) => s.trim()).filter(Boolean)
          );
        } else {
          setByPath(content, path, input.value);
        }
        if (preview) {
          const v = input.value.trim();
          if (!v) {
            preview.hidden = true;
            preview.removeAttribute("src");
          } else {
            preview.hidden = false;
            preview.src =
              v.startsWith("data:") || v.startsWith("/") || v.startsWith("http") ? v : `/${v}`;
          }
        }
      };
    });

    panelsEl.querySelectorAll('input[name="site-theme"]').forEach((radio) => {
      radio.onchange = () => {
        if (!radio.checked) return;
        content.theme = radio.value;
        document.documentElement.setAttribute("data-theme", radio.value);
        panelsEl.querySelectorAll("[data-theme-card]").forEach((card) => {
          card.classList.toggle("is-active", card.getAttribute("data-theme-card") === radio.value);
        });
      };
    });

    panelsEl.querySelectorAll("[data-clear-image]").forEach((btn) => {
      btn.onclick = () => {
        const path = btn.getAttribute("data-clear-image");
        if (!path) return;
        setByPath(content, path, "");
        const textInput = panelsEl.querySelector(`[data-path="${path}"]`);
        if (textInput) textInput.value = "";
        const preview = panelsEl.querySelector(`[data-preview="${path}"]`);
        if (preview) {
          preview.hidden = true;
          preview.removeAttribute("src");
        }
        const fileInput = panelsEl.querySelector(`[data-upload="${path}"]`);
        if (fileInput) fileInput.value = "";
        showToast("Photo removed — click Enregistrer");
      };
    });

    panelsEl.querySelectorAll("[data-upload]").forEach((fileInput) => {
      fileInput.onchange = async () => {
        const file = fileInput.files?.[0];
        const path = fileInput.getAttribute("data-upload");
        if (!file || !path) return;

        const applyUrl = (url) => {
          setByPath(content, path, url);
          const textInput = panelsEl.querySelector(`[data-path="${path}"]`);
          if (textInput) textInput.value = url;
          const preview = panelsEl.querySelector(`[data-preview="${path}"]`);
          if (preview) {
            preview.hidden = false;
            preview.src =
              url.startsWith("data:") || url.startsWith("/") || url.startsWith("http")
                ? url
                : `/${url}`;
          }
        };

        if (useApi) {
          const body = new FormData();
          body.append("image", file);
          try {
            const res = await fetch("/api/upload", {
              method: "POST",
              credentials: "same-origin",
              body,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Upload failed");
            applyUrl(data.url);
            showToast("Photo uploaded — click Enregistrer");
            return;
          } catch (err) {
            showToast(err.message || "Upload failed", true);
          }
        }

        const reader = new FileReader();
        reader.onload = () => {
          applyUrl(String(reader.result || ""));
          showToast("Photo ready — click Enregistrer");
        };
        reader.readAsDataURL(file);
      };
    });

    panelsEl.querySelectorAll("[data-add]").forEach((btn) => {
      btn.onclick = () => {
        harvestFields();
        const path = btn.getAttribute("data-add");
        let list = getByPath(content, path);
        if (!Array.isArray(list)) {
          setByPath(content, path, []);
          list = getByPath(content, path);
        }
        list.push(structuredClone(blanks[path] || {}));
        render();
      };
    });

    panelsEl.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.onclick = () => {
        harvestFields();
        const path = btn.getAttribute("data-remove");
        const index = Number(btn.getAttribute("data-index"));
        const list = getByPath(content, path);
        if (!Array.isArray(list)) return;
        list.splice(index, 1);
        render();
      };
    });

    panelsEl.querySelectorAll("[data-visible]").forEach((input) => {
      input.onchange = () => {
        const path = input.getAttribute("data-visible");
        setByPath(content, path, input.checked);
      };
    });
  };

  const render = () => {
    navEl.innerHTML = sections
      .map(
        (s) =>
          `<button type="button" data-nav="${s.key}" class="${s.key === activeKey ? "is-active" : ""}">${s.label}</button>`
      )
      .join("");

    panelsEl.innerHTML = sections
      .map(
        (s) =>
          `<section class="admins-panel ${s.key === activeKey ? "is-active" : ""}" data-panel="${s.key}">${panelHtml[s.key]()}</section>`
      )
      .join("");

    panelTitle.textContent = sections.find((s) => s.key === activeKey)?.label || "Contenu";
    bindFields();
  };

  const showApp = async () => {
    content = await loadContent();
    if (!content.theme) content.theme = "violet";
    if (!Array.isArray(content.about?.images) || !content.about.images.length) {
      content.about = content.about || {};
      content.about.images = content.about.image
        ? [{ image: content.about.image, alt: "" }]
        : [{ image: "assets/images/voirie.jpg", alt: "" }];
    }
    delete content.about?.points;
    delete content.activities;
    delete content.mission;
    delete content.values;
    delete content.ambition;
    delete content.letter?.p2;
    if (!content.credibility) content.credibility = { items: [] };
    if (!content.audience) content.audience = { kicker: "Pour qui", title: "", image: "", items: [] };
    if (!content.audience.image || content.audience.image.includes("industrie.jpg")) {
      content.audience.image = "assets/images/conseil.jpg";
    }
    if (!content.proof) content.proof = { kicker: "Références", title: "Ils nous font confiance", items: [] };
    if (!Array.isArray(content.proof.items)) content.proof.items = [];
    /* migrate old mission-card references → sample logos */
    if (content.proof.items.some((item) => item && item.sector && !item.image)) {
      content.proof.items = [
        { name: "Nordrail", alt: "Nordrail", image: "assets/images/logos/nordrail.svg" },
        { name: "Atlas Infra", alt: "Atlas Infra", image: "assets/images/logos/atlas-infra.svg" },
        { name: "Medenergie", alt: "Medenergie", image: "assets/images/logos/medenergie.svg" },
        { name: "Rabat Build", alt: "Rabat Build", image: "assets/images/logos/rabat-build.svg" },
        { name: "Sahara Log", alt: "Sahara Log", image: "assets/images/logos/sahara-log.svg" },
        { name: "Ocean Tech", alt: "Ocean Tech", image: "assets/images/logos/ocean-tech.svg" },
      ];
      delete content.proof.lead;
    }
    [
      "hero",
      "about",
      "credibility",
      "letter",
      "direction",
      "sectors",
      "prestations",
      "audience",
      "proof",
      "contact",
    ].forEach((key) => {
      if (!content[key] || typeof content[key] !== "object") content[key] = {};
      if (content[key].visible === undefined) content[key].visible = true;
    });
    if (!content.contact) content.contact = {};
    if (!Array.isArray(content.contact.paths)) content.contact.paths = [];
    document.documentElement.setAttribute("data-theme", content.theme);
    loginView.hidden = true;
    appView.hidden = false;
    logoutBtn.hidden = false;
    render();
  };

  const isLoggedIn = () => sessionStorage.getItem(AUTH_KEY) === "1";

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const password = document.getElementById("password").value.trim();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        useApi = true;
        sessionStorage.setItem(AUTH_KEY, "1");
        try {
          await showApp();
        } catch (err) {
          loginError.hidden = false;
          loginError.textContent = err.message || "Load error";
        }
        return;
      }
    } catch (_) {}

    if (password !== DEFAULT_PASSWORD) {
      loginError.hidden = false;
      loginError.textContent = "Wrong password";
      return;
    }

    sessionStorage.setItem(AUTH_KEY, "1");
    try {
      await showApp();
    } catch (err) {
      loginError.hidden = false;
      loginError.textContent = err.message || "Load error";
    }
  });

  logoutBtn.addEventListener("click", async () => {
    sessionStorage.removeItem(AUTH_KEY);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch (_) {}
    appView.hidden = true;
    logoutBtn.hidden = true;
    loginView.hidden = false;
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const result = await saveContent();
      showToast(
        result.mode === "server"
          ? "Saved to site — refresh http://localhost:5173"
          : "Saved in browser only — run npm start on port 5173 for real saves"
      );
    } catch (err) {
      showToast(err.message || "Save failed", true);
    }
  });

  navEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;
    activeKey = btn.getAttribute("data-nav");
    render();
  });

  if (isLoggedIn()) showApp().catch(() => {});
})();
