(() => {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const year = document.getElementById("year");

  if (year) year.textContent = String(new Date().getFullYear());

  const setHeaderHeight = () => {
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--header-h", `${h}px`);
  };

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  setHeaderHeight();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", setHeaderHeight, { passive: true });

  const closeMenu = () => {
    if (!toggle || !mobileNav || !header) return;
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
    header.classList.remove("menu-open");
    document.body.style.overflow = "";
  };

  const openMenu = () => {
    if (!toggle || !mobileNav || !header) return;
    toggle.setAttribute("aria-expanded", "true");
    mobileNav.hidden = false;
    header.classList.add("menu-open", "is-scrolled");
    document.body.style.overflow = "hidden";
  };

  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    if (open) closeMenu();
    else openMenu();
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const id = hash.slice(1);
      if (id === "top") {
        e.preventDefault();
        const wasMenuOpen = mobileNav && !mobileNav.hidden;
        if (wasMenuOpen) closeMenu();
        const go = () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          history.pushState(null, "", "#top");
        };
        if (wasMenuOpen) requestAnimationFrame(() => requestAnimationFrame(go));
        else go();
        return;
      }

      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      const wasMenuOpen = mobileNav && !mobileNav.hidden;
      if (wasMenuOpen) closeMenu();

      const go = () => {
        header?.classList.add("is-scrolled");
        setHeaderHeight();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", hash);
      };

      if (wasMenuOpen) requestAnimationFrame(() => requestAnimationFrame(go));
      else go();
    });
  });

  const navLinks = [
    ...document.querySelectorAll('.nav a[href^="#"], .mobile-nav a[href^="#"]'),
  ];
  const watched = () =>
    navLinks
      .map((link) => {
        const id = link.getAttribute("href")?.slice(1);
        const section = id ? document.getElementById(id) : null;
        return section ? { link, section } : null;
      })
      .filter(Boolean);

  const syncActiveNav = () => {
    const items = watched();
    const marker = (header?.getBoundingClientRect().height || 80) + 56;
    let current = items[0];
    items.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= marker) current = item;
    });
    navLinks.forEach((link) => link.classList.remove("is-active"));
    if (!current) return;
    const href = `#${current.section.id}`;
    navLinks
      .filter((link) => link.getAttribute("href") === href)
      .forEach((link) => link.classList.add("is-active"));
  };

  window.addEventListener("scroll", syncActiveNav, { passive: true });

  let carouselIndex = 0;

  const initCarousel = () => {
    const root = document.querySelector("[data-carousel]");
    if (!root) return;

    const viewport = root.querySelector(".carousel__viewport");
    const track = root.querySelector("[data-carousel-track]");
    const dotsWrap = root.querySelector("[data-carousel-dots]");
    const prevBtn = document.querySelector("[data-carousel-prev]");
    const nextBtn = document.querySelector("[data-carousel-next]");
    const currentEl = document.querySelector("[data-carousel-current]");
    const totalEl = document.querySelector("[data-carousel-total]");

    if (!track || !viewport || !dotsWrap) return;

    const getSlides = () => [...root.querySelectorAll("[data-carousel-slide]")];
    const slides = getSlides();
    if (!slides.length) return;

    const total = slides.length;
    carouselIndex = Math.min(carouselIndex, total - 1);
    if (totalEl) totalEl.textContent = String(total).padStart(2, "0");

    dotsWrap.innerHTML = "";
    const dots = slides.map((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel-dot";
      btn.setAttribute("aria-label", `Secteur ${i + 1}`);
      btn.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(btn);
      return btn;
    });

    const render = () => {
      const count = getSlides().length;
      if (!count) return;
      carouselIndex = Math.max(0, Math.min(count - 1, carouselIndex));
      track.style.transform = `translate3d(-${carouselIndex * 100}%, 0, 0)`;
      if (currentEl) currentEl.textContent = String(carouselIndex + 1).padStart(2, "0");
      if (totalEl) totalEl.textContent = String(count).padStart(2, "0");
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === carouselIndex));
      if (prevBtn) prevBtn.disabled = carouselIndex === 0;
      if (nextBtn) nextBtn.disabled = carouselIndex >= count - 1;
    };

    const goTo = (i) => {
      const count = getSlides().length;
      if (!count) return;
      carouselIndex = Math.max(0, Math.min(count - 1, i));
      render();
    };

    prevBtn.onclick = () => goTo(carouselIndex - 1);
    nextBtn.onclick = () => goTo(carouselIndex + 1);

    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let axis = null;

    const endSwipe = () => {
      if (axis === "x") {
        track.style.transition = "";
        if (Math.abs(deltaX) > viewport.offsetWidth * 0.18) {
          goTo(deltaX < 0 ? carouselIndex + 1 : carouselIndex - 1);
        } else {
          render();
        }
      }
      axis = null;
      deltaX = 0;
    };

    viewport.ontouchstart = (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
      deltaX = 0;
      axis = null;
      track.style.transition = "none";
    };

    viewport.ontouchmove = (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (axis === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "y") track.style.transition = "";
      }
      if (axis !== "x") return;
      deltaX = dx;
      const pct = (deltaX / viewport.offsetWidth) * 100;
      track.style.transform = `translate3d(calc(-${carouselIndex * 100}% + ${pct}%), 0, 0)`;
    };

    viewport.ontouchend = endSwipe;
    viewport.ontouchcancel = endSwipe;

    render();
  };

  window.refreshCarousel = initCarousel;

  let aboutIndex = 0;

  const initAboutGallery = () => {
    const root = document.querySelector("[data-about-gallery]");
    if (!root) return;

    const track = root.querySelector("[data-list='about.images']");
    const dotsWrap = root.querySelector("[data-about-dots]");
    const prevBtn = root.querySelector("[data-about-prev]");
    const nextBtn = root.querySelector("[data-about-next]");
    const ui = root.querySelector(".about__media-ui");
    const currentEl = root.querySelector("[data-about-current]");
    const totalEl = root.querySelector("[data-about-total]");
    if (!track) return;

    const getSlides = () => [...track.querySelectorAll(".about__media-slide")];
    const slides = getSlides();
    if (!slides.length) return;

    aboutIndex = Math.min(aboutIndex, slides.length - 1);
    if (ui) ui.hidden = slides.length < 2;

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "about__media-dot";
        btn.setAttribute("aria-label", `Photo ${i + 1}`);
        btn.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(btn);
      });
    }

    const render = () => {
      const list = getSlides();
      if (!list.length) return;
      aboutIndex = Math.max(0, Math.min(list.length - 1, aboutIndex));
      track.style.transform = `translate3d(-${aboutIndex * 100}%, 0, 0)`;
      list.forEach((slide, i) => slide.classList.toggle("is-active", i === aboutIndex));
      if (dotsWrap) {
        [...dotsWrap.children].forEach((dot, i) =>
          dot.classList.toggle("is-active", i === aboutIndex)
        );
      }
      if (currentEl) currentEl.textContent = String(aboutIndex + 1).padStart(2, "0");
      if (totalEl) totalEl.textContent = String(list.length).padStart(2, "0");
      if (prevBtn) prevBtn.disabled = aboutIndex === 0;
      if (nextBtn) nextBtn.disabled = aboutIndex >= list.length - 1;
      if (ui) ui.hidden = list.length < 2;
    };

    const goTo = (i) => {
      aboutIndex = i;
      render();
    };

    if (prevBtn) prevBtn.onclick = () => goTo(aboutIndex - 1);
    if (nextBtn) nextBtn.onclick = () => goTo(aboutIndex + 1);

    render();
  };

  window.refreshAboutGallery = initAboutGallery;

  const initPhases = () => {
    const root = document.querySelector("[data-list='prestations.phases']");
    if (!root) return;
    const items = [...root.querySelectorAll("[data-phase]")];
    items.forEach((phase) => {
      const head = phase.querySelector(".phase__head");
      if (!head) return;
      head.onclick = () => {
        const open = phase.classList.contains("is-open");
        items.forEach((other) => {
          other.classList.remove("is-open");
          const btn = other.querySelector(".phase__head");
          if (btn) btn.setAttribute("aria-expanded", "false");
        });
        if (!open) {
          phase.classList.add("is-open");
          head.setAttribute("aria-expanded", "true");
        }
      };
    });
  };

  window.refreshPhases = initPhases;

  const boot = async () => {
    if (window.loadSiteContent) await window.loadSiteContent();
    initCarousel();
    initAboutGallery();
    initPhases();
    syncActiveNav();
  };

  boot();
})();
