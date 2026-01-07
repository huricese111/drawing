document.addEventListener("DOMContentLoaded", () => {
    // State management
    const state = {
        data: [],
        visibleItems: [],
        filter: 'all',
        sort: 'newest',
        searchQuery: '',
        lightboxIndex: 0
    };

    // DOM Elements
    const elements = {
        grid: document.getElementById("galleryGrid"),
        filters: document.getElementById("categoryFilters"),
        sortSelect: document.getElementById("sortSelect"),
        searchInput: document.getElementById("searchInput"),
        noResults: document.getElementById("noResults"),
        year: document.getElementById("year"),
        
        // Lightbox
        lightbox: document.getElementById("lightbox"),
        lightboxImg: document.getElementById("lightboxImg"),
        lightboxTitle: document.getElementById("lightboxTitle"),
        lightboxCategory: document.getElementById("lightboxCategory"),
        lightboxDate: document.getElementById("lightboxDate"),
        lightboxDescription: document.getElementById("lightboxDescription"),
        closeBtn: document.getElementById("closeLightbox"),
        prevBtn: document.getElementById("prevBtn"),
        nextBtn: document.getElementById("nextBtn"),
        overlay: document.querySelector(".lightbox-overlay")
    };

    // Set current year
    elements.year.textContent = new Date().getFullYear();

    // Initialize
    init();

    async function init() {
        try {
            const response = await fetch('gallery.json');
            const jsonData = await response.json();
            state.data = jsonData.items;
            
            setupEventListeners();
            renderFilters();
            processData();
        } catch (error) {
            console.error('Error loading gallery data:', error);
            elements.grid.innerHTML = '<p class="error">Failed to load gallery. Please try again later.</p>';
        }
    }

    function setupEventListeners() {
        // Search
        elements.searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            processData();
        });

        // Sort
        elements.sortSelect.addEventListener('change', (e) => {
            state.sort = e.target.value;
            processData();
        });

        // Lightbox controls
        elements.closeBtn.addEventListener('click', closeLightbox);
        elements.overlay.addEventListener('click', closeLightbox);
        elements.prevBtn.addEventListener('click', showPrevImage);
        elements.nextBtn.addEventListener('click', showNextImage);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (elements.lightbox.classList.contains('hidden')) return;
            
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showPrevImage();
            if (e.key === 'ArrowRight') showNextImage();
        });
    }

    function processData() {
        // 1. Filter
        let processed = state.data.filter(item => {
            const matchesCategory = state.filter === 'all' || item.category === state.filter;
            const matchesSearch = item.title.toLowerCase().includes(state.searchQuery) || 
                                  item.category.toLowerCase().includes(state.searchQuery);
            return matchesCategory && matchesSearch;
        });

        // 2. Sort
        processed.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            
            if (state.sort === 'newest') return dateB - dateA;
            if (state.sort === 'oldest') return dateA - dateB;
            return 0;
        });

        state.visibleItems = processed;
        renderGrid();
    }

    function renderFilters() {
        // Get unique categories
        const categories = ['all', ...new Set(state.data.map(item => item.category))];
        
        elements.filters.innerHTML = categories.map(cat => `
            <button class="filter-btn ${cat === 'all' ? 'active' : ''}" 
                    data-category="${cat}">
                ${cat === 'all' ? 'All Work' : cat}
            </button>
        `).join('');

        // Add click events
        elements.filters.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active class
                elements.filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update state
                state.filter = btn.dataset.category;
                processData();
            });
        });
    }

    function renderGrid() {
        if (state.visibleItems.length === 0) {
            elements.grid.innerHTML = '';
            elements.noResults.classList.remove('hidden');
            return;
        }

        elements.noResults.classList.add('hidden');
        
        elements.grid.innerHTML = state.visibleItems.map((item, index) => `
            <div class="gallery-item" data-index="${index}">
                <div class="image-wrapper">
                    <img src="${item.thumb || item.src}" alt="${item.title}" loading="lazy">
                </div>
                <div class="item-info">
                    <span class="item-category">${item.category}</span>
                    <h3 class="item-title">${item.title}</h3>
                    <span class="item-date">${formatDate(item.date)}</span>
                </div>
            </div>
        `).join('');

        // Add click events for lightbox
        elements.grid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                openLightbox(parseInt(item.dataset.index));
            });
        });
    }

    // Lightbox Functions
    function openLightbox(index) {
        state.lightboxIndex = index;
        updateLightboxContent();
        elements.lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeLightbox() {
        elements.lightbox.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function showNextImage() {
        state.lightboxIndex = (state.lightboxIndex + 1) % state.visibleItems.length;
        updateLightboxContent();
    }

    function showPrevImage() {
        state.lightboxIndex = (state.lightboxIndex - 1 + state.visibleItems.length) % state.visibleItems.length;
        updateLightboxContent();
    }

    function updateLightboxContent() {
        const item = state.visibleItems[state.lightboxIndex];
        
        elements.lightboxImg.src = item.src;
        elements.lightboxImg.alt = item.title;
        elements.lightboxCategory.textContent = item.category;
        elements.lightboxDate.textContent = formatDate(item.date);
        elements.lightboxTitle.textContent = item.title;
        
        // Render description/article
        if (item.article) {
            elements.lightboxDescription.innerHTML = item.article;
        } else {
            elements.lightboxDescription.innerHTML = '<p>No description available for this artwork.</p>';
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
});