document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.style.touchAction = 'pan-y';
  document.documentElement.style.overflowY = 'auto';
  document.body.style.touchAction = 'pan-y';
  document.body.style.overflowY = 'auto';

  const btn = document.getElementById('mobileMenuButton');
  const menu = document.getElementById('mobileMenu');

  if (btn && menu) {
    btn.addEventListener('click', function () {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      menu.classList.toggle('hidden');
    });

    // Close mobile menu when clicking links
    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Optional: add small shadow to header on scroll with throttled updates
  const header = document.querySelector('.site-header');
  if (header) {
    let headerTicking = false;
    const updateHeaderState = function () {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };

    window.addEventListener('scroll', function () {
      if (!headerTicking) {
        window.requestAnimationFrame(function () {
          updateHeaderState();
          headerTicking = false;
        });
        headerTicking = true;
      }
    }, { passive: true });
  }

  /* Gallery: dynamic rendering, filtering and 3D carousel */
  const filters = document.querySelectorAll('.filter-btn');
  const gallerySlider = document.getElementById('gallerySlider');
  const galleryViewport = document.querySelector('.gallery-slider-viewport');
  const galleryPrev = document.getElementById('galleryPrev');
  const galleryNext = document.getElementById('galleryNext');
  const galleryCount = document.getElementById('galleryCount');
  const galleryActiveDetails = document.getElementById('galleryActiveDetails');
  const openFullGallery = document.getElementById('openFullGallery');
  const fullGalleryModal = document.getElementById('fullGalleryModal');
  const fullGalleryClose = document.getElementById('fullGalleryClose');
  const fullGalleryGrid = document.getElementById('fullGalleryGrid');
  const fullGalleryMeta = document.getElementById('fullGalleryMeta');
  const fullGalleryPageInfo = document.getElementById('fullGalleryPageInfo');
  const fullGalleryPrevPage = document.getElementById('fullGalleryPrevPage');
  const fullGalleryNextPage = document.getElementById('fullGalleryNextPage');
  const lightbox = document.getElementById('lightbox');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  const FEATURED_SLIDER_LIMIT = 10;
  const PAGE_SIZE = 24;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchDeltaX = 0;
  let fullGalleryPage = 0;
  let lightboxItems = [];
  let currentLightboxIndex = -1;

  const allGalleryData = Array.isArray(window.galleryData) ? window.galleryData.slice() : [];
  const data = allGalleryData.slice(0, FEATURED_SLIDER_LIMIT);
  let currentFilter = 'all';
  let currentIndex = 0;

  function getFilteredData() {
    if (currentFilter === 'all') return data.slice();
    return data.filter(d => d.category === currentFilter);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (s) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]; });
  }

  function getOptimizedImageUrl(imageUrl) {
    if (!imageUrl) return '';
    const value = String(imageUrl).trim();
    if (!value) return '';
    if (value.startsWith('images/optimized/')) return value;
    if (value.startsWith('images/')) return value.replace(/^images\//, 'images/optimized/');
    return value;
  }

  function renderFullGallery() {
    if (!fullGalleryGrid) return;

    const totalItems = Array.isArray(allGalleryData) ? allGalleryData.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    fullGalleryPage = Math.min(Math.max(0, fullGalleryPage), totalPages - 1);

    const startIndex = fullGalleryPage * PAGE_SIZE;
    const pageItems = allGalleryData.slice(startIndex, startIndex + PAGE_SIZE);

    if (!pageItems.length) {
      fullGalleryGrid.innerHTML = '<div class="col-span-full rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">No gallery items available.</div>';
      if (fullGalleryMeta) fullGalleryMeta.textContent = 'Showing 0 of 0 photos';
      if (fullGalleryPageInfo) fullGalleryPageInfo.textContent = 'Page 1 of 1';
      return;
    }

    fullGalleryGrid.innerHTML = pageItems.map((item, index) => {
      const title = escapeHtml(item.title || 'Project');
      const location = escapeHtml(item.location || 'Community');
      return `
        <button type="button" class="full-gallery-item text-left" data-gallery-item-index="${startIndex + index}" aria-label="Open ${title}">
          <img src="${getOptimizedImageUrl(item.imageUrl)}" alt="${title}" loading="lazy" decoding="async" />
          <div class="full-gallery-caption">
            <h4>${title}</h4>
            <p>${location}</p>
          </div>
        </button>
      `;
    }).join('');

    if (fullGalleryMeta) {
      const visibleBegin = startIndex + 1;
      const visibleEnd = Math.min(startIndex + pageItems.length, totalItems);
      fullGalleryMeta.textContent = `Showing ${visibleBegin}-${visibleEnd} of ${totalItems} photos`;
    }

    if (fullGalleryPageInfo) {
      fullGalleryPageInfo.textContent = `Page ${fullGalleryPage + 1} of ${totalPages}`;
    }

    fullGalleryGrid.querySelectorAll('.full-gallery-item').forEach(item => {
      item.addEventListener('click', function () {
        const selectedIndex = Number(this.dataset.galleryItemIndex);
        const selected = allGalleryData[selectedIndex];
        if (!selected) return;

        lightboxItems = allGalleryData.slice();
        currentLightboxIndex = allGalleryData.findIndex(entry => entry.id === selected.id);
        if (currentLightboxIndex < 0) currentLightboxIndex = selectedIndex;

        openLightboxWithItems(lightboxItems, currentLightboxIndex);
        closeFullGallery();
      });
    });
  }

  function openLightboxWithItems(items, startIndex) {
    if (!lightbox || !items.length) return;

    lightboxItems = items;
    currentLightboxIndex = ((startIndex % items.length) + items.length) % items.length;

    const item = items[currentLightboxIndex];
    const lbImage = document.getElementById('lightboxImage');
    const lbTitle = document.getElementById('lightboxTitle');
    const lbMeta = document.getElementById('lightboxMeta');
    const lbDesc = document.getElementById('lightboxDesc');

    if (!lbImage || !lbTitle || !lbMeta || !lbDesc) return;

    lbImage.src = getOptimizedImageUrl(item.imageUrl);
    lbTitle.textContent = item.title || 'Project';
    lbMeta.textContent = `${item.location || 'Community'} — ${item.date || ''}`;
    lbDesc.textContent = item.description || 'Project photo';
    window.__prevActiveEl = document.activeElement;
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'pan-y';
    document.documentElement.style.touchAction = 'pan-y';
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.classList.remove('lightbox-open');
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'pan-y';
    document.documentElement.style.touchAction = 'pan-y';
    lightboxItems = [];
    currentLightboxIndex = -1;
    if (window.__prevActiveEl && typeof window.__prevActiveEl.focus === 'function') {
      window.__prevActiveEl.focus();
    }
  }

  function moveLightbox(step) {
    if (!lightboxItems.length) return;
    currentLightboxIndex = (currentLightboxIndex + step + lightboxItems.length) % lightboxItems.length;
    const item = lightboxItems[currentLightboxIndex];
    const lbImage = document.getElementById('lightboxImage');
    const lbTitle = document.getElementById('lightboxTitle');
    const lbMeta = document.getElementById('lightboxMeta');
    const lbDesc = document.getElementById('lightboxDesc');

    if (!item || !lbImage || !lbTitle || !lbMeta || !lbDesc) return;

    lbImage.src = getOptimizedImageUrl(item.imageUrl);
    lbTitle.textContent = item.title || 'Project';
    lbMeta.textContent = `${item.location || 'Community'} — ${item.date || ''}`;
    lbDesc.textContent = item.description || 'Project photo';
  }

  function openFullGalleryModal() {
    if (!fullGalleryModal) return;
    fullGalleryPage = 0;
    renderFullGallery();
    fullGalleryModal.classList.remove('hidden');
    fullGalleryModal.classList.add('flex');
  }

  function closeFullGallery() {
    if (!fullGalleryModal) return;
    fullGalleryModal.classList.add('hidden');
    fullGalleryModal.classList.remove('flex');
  }

  function updateActiveGalleryDetail(item) {
    if (!galleryActiveDetails || !item) return;

    const categoryLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Project';
    galleryActiveDetails.innerHTML = `
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">${escapeHtml(categoryLabel)}</p>
      <h3 class="mt-2 text-xl font-bold text-gray-900">${escapeHtml(item.title)}</h3>
      <p class="mt-2 text-sm text-gray-500">${escapeHtml(item.location)} • ${escapeHtml(item.date)}</p>
      <p class="mt-3 text-sm text-gray-700">${escapeHtml(item.description)}</p>
    `;
  }

  function renderGallery() {
    const filtered = getFilteredData();

    if (!gallerySlider) return;

    if (!filtered.length) {
      gallerySlider.innerHTML = '<div class="gallery-empty-state">No projects available.</div>';
      if (galleryCount) galleryCount.textContent = 'Showing 0 of 0 projects';
      if (galleryActiveDetails) {
        galleryActiveDetails.innerHTML = `
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-green-700">Featured project</p>
          <h3 class="mt-2 text-xl font-bold text-gray-900">Waiting for projects…</h3>
          <p class="mt-2 text-sm text-gray-600">The active project details will appear here as the carousel rotates.</p>
        `;
      }
      return;
    }

    currentIndex = ((currentIndex % filtered.length) + filtered.length) % filtered.length;

    gallerySlider.innerHTML = filtered.map((item, index) => {
      const offset = index - currentIndex;
      const absOffset = Math.abs(offset);
      const normalizedOffset = Math.max(-2, Math.min(2, offset));
      const translateX = normalizedOffset * 170;
      const rotateY = normalizedOffset * -38;
      const scale = offset === 0 ? 1.14 : 1 - absOffset * 0.12;
      const opacity = offset === 0 ? 1 : Math.max(0.1, 1 - absOffset * 0.28);
      const zIndex = 100 - absOffset;
      const tag = escapeHtml(item.category);
      const title = escapeHtml(item.title);
      const location = escapeHtml(item.location);
      const date = escapeHtml(item.date);

      return `
        <article class="gallery-card ${offset === 0 ? 'is-active' : ''}" data-id="${item.id}" data-category="${item.category}" data-title="${title}" data-location="${location}" data-date="${date}" data-description="${escapeHtml(item.description)}" style="transform: translateX(${translateX}px) rotateY(${rotateY}deg) scale(${scale}); opacity: ${opacity}; z-index: ${zIndex};">
          <button class="gallery-card-button" type="button" aria-label="Open ${title}">
            <img src="${getOptimizedImageUrl(item.imageUrl)}" alt="${title}" loading="lazy" decoding="async" />
            <div class="gallery-card-body">
              <span class="gallery-tag">${tag}</span>
              <h3>${title}</h3>
              <p>${location} • ${date}</p>
            </div>
          </button>
        </article>
      `;
    }).join('');

    if (galleryCount) {
      galleryCount.textContent = `Showing ${filtered.length} of ${filtered.length} projects`;
    }

    updateActiveGalleryDetail(filtered[currentIndex]);
    attachItemHandlers();
  }

  function attachItemHandlers() {
    const cards = Array.from(document.querySelectorAll('.gallery-card'));
    cards.forEach(card => {
      const button = card.querySelector('button');
      if (!button) return;

      button.addEventListener('click', function () {
        const allItems = getFilteredData();
        const selected = allItems.find(item => String(item.id) === String(card.dataset.id));
        if (!selected) return;

        const img = card.querySelector('img');
        if (!img) return;

        const selectedIndex = allItems.findIndex(item => String(item.id) === String(selected.id));
        lightboxItems = allItems;
        currentLightboxIndex = selectedIndex >= 0 ? selectedIndex : 0;

        const lbImage = document.getElementById('lightboxImage');
        const lbTitle = document.getElementById('lightboxTitle');
        const lbMeta = document.getElementById('lightboxMeta');
        const lbDesc = document.getElementById('lightboxDesc');

        if (!lbImage || !lbTitle || !lbMeta || !lbDesc) return;

        lbImage.src = img.src;
        lbTitle.textContent = selected.title;
        lbMeta.textContent = `${selected.location} — ${selected.date}`;
        lbDesc.textContent = selected.description;
        window.__prevActiveEl = document.activeElement;
        document.body.classList.add('lightbox-open');
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'pan-y';
        document.documentElement.style.touchAction = 'pan-y';
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
      });
    });
  }

  filters.forEach(btn => {
    btn.addEventListener('click', function () {
      currentFilter = btn.getAttribute('data-filter');
      currentIndex = 0;
      filters.forEach(b => b.classList.remove('ring-2', 'ring-offset-2'));
      btn.classList.add('ring-2', 'ring-offset-2');
      renderGallery();
    });
  });

  function moveGallery(step) {
    const filtered = getFilteredData();
    if (!filtered.length) return;
    currentIndex = (currentIndex + step + filtered.length) % filtered.length;
    renderGallery();
  }

  if (galleryPrev) {
    galleryPrev.addEventListener('click', function () {
      moveGallery(-1);
    });
  }

  if (galleryNext) {
    galleryNext.addEventListener('click', function () {
      moveGallery(1);
    });
  }

  if (openFullGallery) {
    openFullGallery.addEventListener('click', openFullGalleryModal);
  }

  if (fullGalleryClose) {
    fullGalleryClose.addEventListener('click', closeFullGallery);
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function () {
      moveLightbox(-1);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', function () {
      moveLightbox(1);
    });
  }

  if (lightbox) {
    lightbox.addEventListener('click', function (event) {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', function (event) {
      if (lightbox && !lightbox.classList.contains('hidden') && event.key === 'Escape') {
        closeLightbox();
      }
    });
  }

  if (fullGalleryModal) {
    fullGalleryModal.addEventListener('click', function (event) {
      if (event.target === fullGalleryModal) closeFullGallery();
    });
  }

  if (fullGalleryPrevPage) {
    fullGalleryPrevPage.addEventListener('click', function () {
      if (allGalleryData.length <= PAGE_SIZE) return;
      fullGalleryPage = Math.max(0, fullGalleryPage - 1);
      renderFullGallery();
    });
  }

  if (fullGalleryNextPage) {
    fullGalleryNextPage.addEventListener('click', function () {
      const totalPages = Math.max(1, Math.ceil(allGalleryData.length / PAGE_SIZE));
      if (fullGalleryPage >= totalPages - 1) return;
      fullGalleryPage += 1;
      renderFullGallery();
    });
  }

  if (galleryViewport) {
    galleryViewport.addEventListener('pointerdown', function (event) {
      touchStartX = event.clientX;
      touchStartY = event.clientY;
      touchDeltaX = 0;
    }, { passive: true });

    galleryViewport.addEventListener('pointermove', function (event) {
      if (!touchStartX) return;
      touchDeltaX = event.clientX - touchStartX;
    }, { passive: true });

    galleryViewport.addEventListener('pointerup', function (event) {
      const deltaY = event.clientY - touchStartY;
      if (Math.abs(touchDeltaX) > 50 && Math.abs(touchDeltaX) > Math.abs(deltaY)) {
        moveGallery(touchDeltaX < 0 ? 1 : -1);
      }
      touchStartX = 0;
      touchStartY = 0;
      touchDeltaX = 0;
    });

    galleryViewport.addEventListener('pointerleave', function () {
      touchStartX = 0;
      touchStartY = 0;
      touchDeltaX = 0;
    });

    galleryViewport.addEventListener('touchstart', function (event) {
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchDeltaX = 0;
    }, { passive: true });

    galleryViewport.addEventListener('touchend', function (event) {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        moveGallery(deltaX < 0 ? 1 : -1);
      }
      touchStartX = 0;
      touchStartY = 0;
      touchDeltaX = 0;
    }, { passive: true });
  }

  renderGallery();

  // --- Contact form handling ---
  const contactForm = document.getElementById('contactForm');
  const contactMsg = document.getElementById('contactMsg');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('contactName').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const email = document.getElementById('contactEmail').value.trim();
      const lga = document.getElementById('contactLGA').value.trim();
      const message = document.getElementById('contactMessage').value.trim();

      if (!name || !phone || !email) {
        contactMsg.textContent = 'Please fill Name, Phone and Email.';
        return;
      }

      // For demo: log and show message. In production, POST to server.
      console.log('Contact submission', { name, phone, email, lga, message });
      contactMsg.textContent = 'Thank you — your message has been received.';
      contactForm.reset();
      setTimeout(() => { contactMsg.textContent = ''; }, 5000);
    });
  }

  // --- Volunteer modal handling ---
  const volunteerModal = document.getElementById('volunteerModal');
  const openVolunteerModal = document.getElementById('openVolunteerModal');
  const volunteerClose = document.getElementById('volunteerClose');
  const volunteerCancel = document.getElementById('volunteerCancel');
  const volunteerForm = document.getElementById('volunteerForm');
  const volMsg = document.getElementById('volMsg');

  function showVolunteerModal() { if (volunteerModal) { volunteerModal.classList.remove('hidden'); volunteerModal.classList.add('flex'); } }
  function hideVolunteerModal() { if (volunteerModal) { volunteerModal.classList.add('hidden'); volunteerModal.classList.remove('flex'); } }

  if (openVolunteerModal) openVolunteerModal.addEventListener('click', showVolunteerModal);
  if (volunteerClose) volunteerClose.addEventListener('click', hideVolunteerModal);
  if (volunteerCancel) volunteerCancel.addEventListener('click', hideVolunteerModal);
  if (volunteerModal) volunteerModal.addEventListener('click', function (e) { if (e.target === volunteerModal) hideVolunteerModal(); });

  // Focus management for volunteer modal
  if (openVolunteerModal) {
    openVolunteerModal.addEventListener('click', function () {
      window.__prevActiveEl = document.activeElement;
      showVolunteerModal();
      const first = document.getElementById('volName');
      if (first) first.focus();
    });
  }
  if (volunteerClose) volunteerClose.addEventListener('click', function () { hideVolunteerModal(); if (window.__prevActiveEl && typeof window.__prevActiveEl.focus === 'function') window.__prevActiveEl.focus(); });
  if (volunteerCancel) volunteerCancel.addEventListener('click', function () { hideVolunteerModal(); if (window.__prevActiveEl && typeof window.__prevActiveEl.focus === 'function') window.__prevActiveEl.focus(); });

  if (volunteerForm) {
    volunteerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('volName').value.trim();
      const phone = document.getElementById('volPhone').value.trim();
      const email = document.getElementById('volEmail').value.trim();
      const lga = document.getElementById('volLGA').value.trim();
      const interest = document.getElementById('volInterest').value;
      const note = document.getElementById('volNote').value.trim();

      if (!name || !phone) { volMsg.textContent = 'Please provide name and phone.'; return; }

      console.log('Volunteer signup', { name, phone, email, lga, interest, note });
      volMsg.textContent = 'Thanks — we will contact you soon.';
      volunteerForm.reset();
      setTimeout(() => { hideVolunteerModal(); volMsg.textContent = ''; }, 1800);
    });
  }
});
