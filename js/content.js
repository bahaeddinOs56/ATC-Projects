(() => {
  const STORAGE_KEY = "atc_site_content";

  const setText = (sel, value) => {
    const el = document.querySelector(sel);
    if (el && value != null) el.textContent = value;
  };

  const setAttr = (sel, attr, value) => {
    const el = document.querySelector(sel);
    if (el && value != null) el.setAttribute(attr, value);
  };

  const mediaUrl = (value) => {
    if (!value) return "";
    if (
      value.startsWith("data:") ||
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/")
    ) {
      return value;
    }
    return `/${value.replace(/^\.\//, "")}`;
  };

  const setSrc = (sel, value) => {
    const el = document.querySelector(sel);
    if (!el || !value) return;
    el.src = mediaUrl(value);
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  const setVisible = (sel, visible) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.hidden = visible === false;
    });
  };

  const applySectionVisibility = (data) => {
    const map = [
      [".hero", data.hero],
      ["#societe", data.about],
      [".credibility", data.credibility],
      ["#mot-dg", data.letter],
      ["#direction", data.direction],
      ["#secteurs", data.sectors],
      ["#methode", data.prestations],
      ["#pour-qui", data.audience],
      ["#references", data.proof],
      ["#contact", data.contact],
    ];
    map.forEach(([sel, section]) => {
      setVisible(sel, section?.visible !== false);
    });

    const navVisibility = {
      "#societe": data.about?.visible !== false,
      "#secteurs": data.sectors?.visible !== false,
      "#references": data.proof?.visible !== false,
      "#contact": data.contact?.visible !== false,
      "#direction": data.direction?.visible !== false,
      "#methode": data.prestations?.visible !== false,
      "#pour-qui": data.audience?.visible !== false,
      "#mot-dg": data.letter?.visible !== false,
    };
    document.querySelectorAll(".nav a, .mobile-nav a, .footer-nav a").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (Object.prototype.hasOwnProperty.call(navVisibility, href)) {
        a.hidden = !navVisibility[href];
      }
    });
  };

  window.applySiteContent = (data) => {
    if (!data) return;

    document.documentElement.setAttribute("data-theme", data.theme || "violet");
    applySectionVisibility(data);

    const {
      hero,
      about,
      credibility,
      letter,
      direction,
      sectors,
      prestations,
      audience,
      proof,
      contact,
    } = data;

    if (hero) {
      setText("[data-field='hero.brand']", hero.brand);
      setText("[data-field='hero.title']", hero.title);
      setText("[data-field='hero.lead']", hero.lead);
      setSrc("[data-field='hero.image']", hero.image);
      setText("[data-field='hero.ctaPrimary']", hero.ctaPrimary);
      setAttr("[data-field='hero.ctaPrimary']", "href", hero.ctaPrimaryHref || "#contact");
      setText("[data-field='hero.ctaSecondary']", hero.ctaSecondary);
      setAttr("[data-field='hero.ctaSecondary']", "href", hero.ctaSecondaryHref || "#secteurs");
    }

    if (about) {
      setText("[data-field='about.kicker']", about.kicker);
      setText("[data-field='about.title']", about.title);
      setText("[data-field='about.lead']", about.lead);
      setText("[data-field='about.text']", about.text);

      let images = Array.isArray(about.images)
        ? about.images.filter((img) => img && (img.image || img.src))
        : [];
      if (!images.length && about.image) {
        images = [{ image: about.image, alt: about.title || "" }];
      }

      const track = document.querySelector("[data-list='about.images']");
      if (track) {
        track.innerHTML = images
          .map(
            (img, i) => `
            <div class="about__media-slide${i === 0 ? " is-active" : ""}">
              <img src="${escapeAttr(mediaUrl(img.image || img.src))}" alt="${escapeAttr(img.alt || about.title || "")}" width="900" height="700" loading="${i === 0 ? "eager" : "lazy"}" />
            </div>`
          )
          .join("");
      }
    }

    const credibilityEl = document.querySelector("[data-list='credibility.items']");
    if (credibilityEl && Array.isArray(credibility?.items)) {
      credibilityEl.innerHTML = credibility.items
        .map(
          (item) => `
        <li>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </li>`
        )
        .join("");
    }

    if (letter) {
      setText("[data-field='letter.kicker']", letter.kicker);
      setText("[data-field='letter.quote']", letter.quote);
      setText("[data-field='letter.p1']", letter.p1);
      setText("[data-field='letter.name']", letter.name);
      setText("[data-field='letter.role']", letter.role);
    }

    if (direction) {
      setText("[data-field='direction.kicker']", direction.kicker);
      setText("[data-field='direction.title']", direction.title);
      const leaders = document.querySelector("[data-list='direction.people']");
      if (leaders && Array.isArray(direction.people)) {
        leaders.innerHTML = direction.people
          .map((p) => {
            const photo = p.image
              ? `<div class="leader__photo"><img src="${escapeAttr(mediaUrl(p.image))}" alt="${escapeAttr(p.name || "")}" width="480" height="600" loading="lazy" /></div>`
              : "";
            return `
          <article class="leader${p.image ? "" : " leader--no-photo"}">
            ${photo}
            <div class="leader__body">
              <p class="leader__role">${escapeHtml(p.role)}</p>
              <h3>${escapeHtml(p.name)}</h3>
              <p>${escapeHtml(p.bio)}</p>
            </div>
          </article>`;
          })
          .join("");
      }
    }

    if (sectors) {
      setText("[data-field='sectors.kicker']", sectors.kicker);
      setText("[data-field='sectors.title']", sectors.title);
      const track = document.querySelector("[data-list='sectors.items']");
      if (track && Array.isArray(sectors.items)) {
        track.innerHTML = sectors.items
          .map((item, i) => {
            const flip = i % 2 === 1 ? " carousel__slide--flip" : "";
            return `
            <article class="carousel__slide${flip}" data-carousel-slide>
              <img src="${escapeAttr(mediaUrl(item.image))}" alt="${escapeAttr(item.alt || item.title)}" width="1400" height="900" />
              <div class="carousel__text">
                <span>${escapeHtml(item.label)}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.text)}</p>
              </div>
            </article>`;
          })
          .join("");
      }
    }

    if (prestations) {
      setText("[data-field='prestations.kicker']", prestations.kicker);
      setText("[data-field='prestations.title']", prestations.title);
      const phases = document.querySelector("[data-list='prestations.phases']");
      if (phases && Array.isArray(prestations.phases)) {
        phases.innerHTML = prestations.phases
          .map(
            (phase, i) => `
          <article class="phase" data-phase>
            <button type="button" class="phase__head" aria-expanded="false">
              <p class="phase__step"><span>${String(i + 1).padStart(2, "0")}</span> ${escapeHtml(phase.tag)}</p>
              <h3>${escapeHtml(phase.title)}</h3>
              <span class="phase__chevron" aria-hidden="true"></span>
            </button>
            <div class="phase__body">
              <div class="phase__body-inner">
                <ul>${(phase.items || []).map((li) => `<li>${escapeHtml(li)}</li>`).join("")}</ul>
              </div>
            </div>
          </article>`
          )
          .join("");
      }
      if (typeof window.refreshPhases === "function") window.refreshPhases();
    }

    if (audience) {
      setText("[data-field='audience.kicker']", audience.kicker);
      setText("[data-field='audience.title']", audience.title);
      setSrc("[data-field='audience.image']", audience.image);
      const list = document.querySelector("[data-list='audience.items']");
      if (list && Array.isArray(audience.items)) {
        list.innerHTML = audience.items
          .map(
            (item) => `
          <article class="audience__item">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.text)}</p>
          </article>`
          )
          .join("");
      }
    }

    if (proof) {
      setText("[data-field='proof.kicker']", proof.kicker);
      setText("[data-field='proof.title']", proof.title);
      const list = document.querySelector("[data-list='proof.items']");
      const marquee = document.querySelector(".logo-marquee");
      const logos = Array.isArray(proof.items)
        ? proof.items.filter((item) => item && item.image)
        : [];
      if (marquee) marquee.hidden = logos.length === 0;
      if (list) {
        if (!logos.length) {
          list.innerHTML = "";
        } else {
          const slide = (item) => `
          <div class="logo-marquee__item">
            <img src="${escapeAttr(mediaUrl(item.image))}" alt="${escapeAttr(item.alt || item.name || "")}" loading="eager" decoding="async" draggable="false" />
          </div>`;
          const row = logos.map(slide).join("");
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          if (reduceMotion) {
            list.innerHTML = `<div class="logo-marquee__set">${row}</div>`;
            list.classList.add("is-static");
          } else {
            list.innerHTML = `
              <div class="logo-marquee__set">${row}</div>
              <div class="logo-marquee__set" aria-hidden="true">${row}</div>`;
            list.classList.remove("is-static");
          }
        }
      }
      if (typeof window.refreshLogoMarquee === "function") window.refreshLogoMarquee();
    }

    if (contact) {
      const phone = contact.phone || "";
      const tel = contact.phoneHref || (phone ? `tel:${String(phone).replace(/\s/g, "")}` : "");
      setText("[data-field='contact.kicker']", contact.kicker);
      setText("[data-field='contact.title']", contact.title);
      setText("[data-field='contact.lead']", contact.lead);
      setText("[data-field='contact.phone']", phone);
      if (tel) {
        setAttr("[data-field='contact.phone']", "href", tel);
        setAttr("[data-action='call']", "href", tel);
      }
      setText("[data-field='contact.address']", contact.address);

      const emailsWrap = document.querySelector("[data-list='contact.emails']");
      if (emailsWrap && Array.isArray(contact.emails)) {
        emailsWrap.innerHTML = contact.emails
          .map(
            (email) =>
              `<a class="contact__mail" href="mailto:${escapeAttr(email)}">${escapeHtml(email)}</a>`
          )
          .join("");
      }

      const mailBtn = document.querySelector("[data-action='email']");
      if (mailBtn && contact.emails?.[0]) {
        mailBtn.href = `mailto:${contact.emails[0]}`;
      }

      const paths = document.querySelector("[data-list='contact.paths']");
      if (paths && Array.isArray(contact.paths)) {
        paths.innerHTML = contact.paths
          .map(
            (path) =>
              `<a class="contact__path" href="${escapeAttr(path.href)}">${escapeHtml(path.label)}</a>`
          )
          .join("");
      }
    }

    if (typeof window.refreshCarousel === "function") window.refreshCarousel();
    if (typeof window.refreshAboutGallery === "function") window.refreshAboutGallery();
  };

  let loadPromise = null;

  window.loadSiteContent = () => {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const res = await fetch("/api/content", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          window.applySiteContent(data);
          return data;
        }
      } catch (_) {}

      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const data = JSON.parse(local);
          /* prefer fresh schema from disk if local is old fluff-heavy */
          if (
            !data.proof ||
            !data.audience ||
            data.values ||
            data.ambition ||
            data.activities ||
            (Array.isArray(data.proof.items) && data.proof.items.some((i) => i && i.sector && !i.image))
          ) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            window.applySiteContent(data);
            return data;
          }
        }
      } catch (err) {
        console.error("atc local content failed", err);
      }

      try {
        const res = await fetch("/data/content.json", { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        window.applySiteContent(data);
        return data;
      } catch (err) {
        console.error("atc content.json failed", err);
        return null;
      }
    })();

    return loadPromise;
  };

  try {
    const channel = new BroadcastChannel("atc_content_sync");
    channel.onmessage = (event) => {
      if (event?.data?.type === "content" && event.data.data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(event.data.data));
        window.applySiteContent(event.data.data);
      }
    };
  } catch (_) {}

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      window.applySiteContent(JSON.parse(event.newValue));
    } catch (_) {}
  });

  const run = () => {
    window.loadSiteContent().catch((err) => console.error("atc load failed", err));
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
