document.addEventListener('DOMContentLoaded', function () {
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

  // Optional: add small shadow to header on scroll
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    });
  }

  /* Gallery: dynamic rendering, filtering and lightbox with pagination */
  const STORAGE_KEY = 'apmGalleryProjects';
  const filters = document.querySelectorAll('.filter-btn');
  const galleryGrid = document.querySelector('.gallery-grid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  function getPersistedGalleryData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (error) {
      console.warn('Could not load gallery data from localStorage:', error);
      return [];
    }
  }

  function savePersistedGalleryData(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Could not save gallery data to localStorage:', error);
    }
  }

  function mergeGalleryData(defaultItems, persistedItems) {
    const merged = Array.isArray(defaultItems) ? defaultItems.slice() : [];
    const persisted = Array.isArray(persistedItems) ? persistedItems : [];

    persisted.forEach(item => {
      if (!item) return;
      const alreadyExists = merged.some(existing => {
        const sameId = existing && item && existing.id && item.id && String(existing.id) === String(item.id);
        const sameContent = existing && item && existing.title === item.title && existing.location === item.location && existing.date === item.date;
        return sameId || sameContent;
      });

      if (!alreadyExists) merged.push(item);
    });

    return merged;
  }

  const defaultGalleryData = Array.isArray(window.galleryData) ? window.galleryData : [];
  const persistedGalleryData = getPersistedGalleryData();
  window.galleryData = mergeGalleryData(defaultGalleryData, persistedGalleryData);

  const data = window.galleryData || [];
  const pageSize = 6; // initial visible project count
  let currentPage = 1;
  let currentFilter = 'all';

  function getFilteredData() {
    if (currentFilter === 'all') return data.slice();
    return data.filter(d => d.category === currentFilter);
  }

  function renderGallery() {
    const filtered = getFilteredData();
    const showCount = currentPage * pageSize;
    const pageItems = filtered.slice(0, showCount);

    galleryGrid.innerHTML = pageItems.map(item => {
      return `
        <article class="gallery-item rounded overflow-hidden shadow-sm" data-id="${item.id}" data-category="${item.category}" data-title="${escapeHtml(item.title)}" data-location="${escapeHtml(item.location)}" data-date="${item.date}" data-description="${escapeHtml(item.description)}">
          <button class="w-full focus:outline-none" aria-label="Open ${escapeHtml(item.title)}">
            <img src="${item.imageUrl}" alt="${escapeHtml(item.title)}" class="w-full h-48 object-cover" loading="lazy" decoding="async">
            <div class="p-3 bg-white">
              <h4 class="font-semibold">${escapeHtml(item.title)}</h4>
              <p class="text-sm text-gray-600">${escapeHtml(item.location)} — ${item.date}</p>
            </div>
          </button>
        </article>
      `;
    }).join('');

    if (loadMoreBtn) {
      const hasMore = filtered.length > pageItems.length;
      loadMoreBtn.classList.toggle('hidden', !hasMore);
      loadMoreBtn.classList.toggle('opacity-0', !hasMore);
      loadMoreBtn.classList.toggle('pointer-events-none', !hasMore);
      loadMoreBtn.style.transition = 'opacity 0.25s ease';
      loadMoreBtn.style.opacity = hasMore ? '1' : '0';
    }

    attachItemHandlers();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (s) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]; });
  }

  // Attach click handlers for dynamically rendered items
  function attachItemHandlers() {
    const items = Array.from(document.querySelectorAll('.gallery-item'));
    items.forEach((it, idx) => {
      const btn = it.querySelector('button');
      if (!btn) return;
      btn.onclick = function () {
        const visible = Array.from(document.querySelectorAll('.gallery-item'));
        const index = visible.indexOf(it);
        openLightbox(index);
      };
    });
  }

  // Filters
  filters.forEach(btn => {
    btn.addEventListener('click', function () {
      currentFilter = btn.getAttribute('data-filter');
      currentPage = 1;
      filters.forEach(b => b.classList.remove('ring-2', 'ring-offset-2'));
      btn.classList.add('ring-2', 'ring-offset-2');
      renderGallery();
    });
  });

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      currentPage += 1;
      renderGallery();
    });
  }

  // Lightbox elements
  const lightbox = document.getElementById('lightbox');
  const lbImage = document.getElementById('lightboxImage');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbMeta = document.getElementById('lightboxMeta');
  const lbDesc = document.getElementById('lightboxDesc');
  const lbClose = document.getElementById('lightboxClose');
  const lbPrev = document.getElementById('lightboxPrev');
  const lbNext = document.getElementById('lightboxNext');

  let currentIndex = -1;

  function visibleItems() {
    return Array.from(document.querySelectorAll('.gallery-item'));
  }

  function openLightbox(index) {
    const all = visibleItems();
    const el = all[index];
    if (!el) return;
    const img = el.querySelector('img').src;
    lbImage.src = img;
    lbTitle.textContent = el.getAttribute('data-title');
    lbMeta.textContent = `${el.getAttribute('data-location')} — ${el.getAttribute('data-date')}`;
    lbDesc.textContent = el.getAttribute('data-description');
    currentIndex = index;
    // save focus and show modal
    window.__prevActiveEl = document.activeElement;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    if (lbClose) lbClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    lbImage.src = '';
    currentIndex = -1;
    if (window.__prevActiveEl && typeof window.__prevActiveEl.focus === 'function') window.__prevActiveEl.focus();
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  if (lbPrev) lbPrev.addEventListener('click', function () { if (currentIndex > 0) openLightbox(currentIndex - 1); });
  if (lbNext) lbNext.addEventListener('click', function () { if (currentIndex < visibleItems().length - 1) openLightbox(currentIndex + 1); });
  document.addEventListener('keydown', function (e) { if (currentIndex === -1) return; if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowLeft') lbPrev.click(); if (e.key === 'ArrowRight') lbNext.click(); });

  // Initial render
  renderGallery();

  // --- Admin form: add new projects client-side ---
  const adminForm = document.getElementById('adminForm');
  const adminPreviewBtn = document.getElementById('adminPreviewBtn');
  const adminPreview = document.getElementById('adminPreview');
  const adminPreviewImg = document.getElementById('adminPreviewImg');
  const adminMsg = document.getElementById('adminMsg');
  const projImageFile = document.getElementById('projImageFile');

  // Holds the data URL of the selected image file for admin preview/submission
  let adminImageDataUrl = null;

  function clearAdminMsg() { adminMsg.textContent = ''; }

  // Preview from selected file (FileReader)
  if (projImageFile) {
    projImageFile.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        adminMsg.textContent = 'No file selected.';
        return;
      }
      if (!file.type.startsWith('image/')) {
        adminMsg.textContent = 'Please select a valid image file.';
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        adminImageDataUrl = ev.target.result;
        adminPreviewImg.src = adminImageDataUrl;
        adminPreview.classList.remove('hidden');
        clearAdminMsg();
      };
      reader.readAsDataURL(file);
    });
  }

  if (adminForm) {
    adminForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const title = document.getElementById('projTitle').value.trim();
      const category = document.getElementById('projCategory').value;
      const location = document.getElementById('projLocation').value.trim();
      const date = document.getElementById('projDate').value;
      const description = document.getElementById('projDesc').value.trim();
      // Use selected file data URL if available, otherwise fallback to placeholder
      const imageUrl = adminImageDataUrl || 'https://via.placeholder.com/1200x800?text=No+Image';

      if (!title || !location || !date) {
        adminMsg.textContent = 'Please fill required fields: Title, Location, Date.';
        return;
      }

      const newItem = {
        id: Date.now(),
        category: category,
        title: title,
        location: location,
        date: date,
        description: description,
        imageUrl: imageUrl
      };

      const storedProjects = getPersistedGalleryData();
      const updatedProjects = [newItem, ...storedProjects];
      savePersistedGalleryData(updatedProjects);

      const mergedData = mergeGalleryData(defaultGalleryData, updatedProjects);
      window.galleryData = mergedData;

      // Reset filters and render so the new item is visible
      currentFilter = 'all';
      currentPage = Math.ceil(getFilteredData().length / pageSize);
      renderGallery();

      adminMsg.textContent = 'Project added to gallery and saved locally.';
      adminForm.reset();
      adminPreview.classList.add('hidden');
      adminImageDataUrl = null;
    });
  }

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
