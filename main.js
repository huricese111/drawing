document.addEventListener("DOMContentLoaded", () => {
    // State management
    const state = {
        data: [],
        visibleItems: [],
        filter: 'all',
        sort: 'newest',
        searchQuery: '',
        lightboxIndex: 0,
        subImageIndex: 0 // Track current image within a collection
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
        lightboxDescription: document.getElementById("lightboxDescription"), // Corrected ID to match HTML
        commentsSection: document.getElementById("commentsSection"), // Comments
        closeBtn: document.getElementById("closeLightbox"),
        prevBtn: document.getElementById("prevBtn"),
        nextBtn: document.getElementById("nextBtn"),
        overlay: document.querySelector(".lightbox-overlay"),
        
        // Lightbox Sub-navigation (Inner Gallery)
        prevSubBtn: document.getElementById("prevSubBtn"),
        nextSubBtn: document.getElementById("nextSubBtn"),
        subIndicators: document.getElementById("subImageIndicators")
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

        // Lightbox controls (Main navigation)
        elements.closeBtn.addEventListener('click', closeLightbox);
        elements.overlay.addEventListener('click', closeLightbox);
        elements.prevBtn.addEventListener('click', showPrevImage);
        elements.nextBtn.addEventListener('click', showNextImage);
        
        // Lightbox controls (Sub navigation)
        elements.prevSubBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent closing lightbox if clicked on button
            showPrevSubImage();
        });
        elements.nextSubBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showNextSubImage();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (elements.lightbox.classList.contains('hidden')) return;
            
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showPrevImage();
            if (e.key === 'ArrowRight') showNextImage();
            // Up/Down for sub-images? Or maybe just rely on clicks for now to avoid confusion
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
                    ${item.images && item.images.length > 1 ? '<div class="multi-icon">❐</div>' : ''}
                </div>
                <div class="item-info">
                    <span class="item-category">${item.category}</span>
                    <h3 class="item-title">${item.title}</h3>
                    <span class="item-date">${formatDate(item.date)}</span>
                </div>
            </div>
        `).join('');

        elements.grid.querySelectorAll('.gallery-item').forEach(item => {
            const index = parseInt(item.dataset.index);
            const wrapper = item.querySelector('.image-wrapper');
            const img = item.querySelector('img');

            if (wrapper && img) {
                const onLoad = () => {
                    wrapper.classList.add('loaded');
                    img.classList.add('is-loaded');
                };

                if (img.complete && img.naturalWidth > 0) {
                    onLoad();
                } else {
                    img.addEventListener('load', onLoad, { once: true });
                }
            }

            item.addEventListener('click', () => {
                openLightbox(index);
            });
        });
    }

    // --- Comment System (Utterances) ---
    function loadComments(item) {
        const container = elements.commentsSection;
        container.innerHTML = '<div class="loading-comments">Loading comments...</div>'; // Visual feedback

        // Use setTimeout to allow the UI to render the "Loading..." text first
        // and to ensure the container is visible (if called after removing 'hidden' class)
        setTimeout(() => {
            container.innerHTML = ''; // Clear loading text
            
            const script = document.createElement('script');
            script.src = 'https://utteranc.es/client.js';
            script.setAttribute('repo', 'huricese111/drawing'); // Your GitHub Repo
            script.setAttribute('issue-term', item.id); // Map comments to the item ID
            script.setAttribute('theme', 'github-dark');
            script.setAttribute('crossorigin', 'anonymous');
            script.async = true;

            container.appendChild(script);
        }, 100);
    }

    // --- Lightbox Functions ---
    function openLightbox(index) {
        state.lightboxIndex = index;
        state.subImageIndex = 0; // Reset sub-index when opening new item
        
        // 1. Show lightbox first so elements are visible in DOM
        elements.lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // 2. Then update content and load comments
        updateLightboxContent();
    }

    function closeLightbox() {
        elements.lightbox.classList.add('hidden');
        document.body.style.overflow = '';
    }

    function showNextImage() {
        state.lightboxIndex = (state.lightboxIndex + 1) % state.visibleItems.length;
        state.subImageIndex = 0; // Reset sub-index for new item
        updateLightboxContent();
    }

    function showPrevImage() {
        state.lightboxIndex = (state.lightboxIndex - 1 + state.visibleItems.length) % state.visibleItems.length;
        state.subImageIndex = 0; // Reset sub-index for new item
        updateLightboxContent();
    }

    function showNextSubImage() {
        const item = state.visibleItems[state.lightboxIndex];
        if (item.images && item.images.length > 1) {
            state.subImageIndex = (state.subImageIndex + 1) % item.images.length;
            updateLightboxContent(true); // Skip reloading comments
        }
    }

    function showPrevSubImage() {
        const item = state.visibleItems[state.lightboxIndex];
        if (item.images && item.images.length > 1) {
            state.subImageIndex = (state.subImageIndex - 1 + item.images.length) % item.images.length;
            updateLightboxContent(true); // Skip reloading comments
        }
    }

    function updateLightboxContent(skipComments = false) {
        const item = state.visibleItems[state.lightboxIndex];
        
        // Determine which image to show
        let currentSrc = item.src;
        let hasMultipleImages = false;

        if (item.images && item.images.length > 1) {
            hasMultipleImages = true;
            // Ensure index is valid
            if (state.subImageIndex >= item.images.length) state.subImageIndex = 0;
            currentSrc = item.images[state.subImageIndex];
        }

        elements.lightboxImg.classList.remove('is-loaded');
        elements.lightboxImg.src = currentSrc;
        elements.lightboxImg.alt = item.title;

        const handleLightboxLoad = () => {
            elements.lightboxImg.classList.add('is-loaded');
        };

        if (elements.lightboxImg.complete && elements.lightboxImg.naturalWidth > 0) {
            handleLightboxLoad();
        } else {
            elements.lightboxImg.addEventListener('load', function onLoad() {
                elements.lightboxImg.removeEventListener('load', onLoad);
                handleLightboxLoad();
            });
        }
        elements.lightboxCategory.textContent = item.category;
        elements.lightboxDate.textContent = formatDate(item.date);
        elements.lightboxTitle.textContent = item.title;
        
        // Render description/article
        if (item.article) {
            elements.lightboxDescription.innerHTML = item.article;
        } else {
            elements.lightboxDescription.innerHTML = '<p>No description available for this artwork.</p>';
        }

        // Load Comments (Only if switching main items, not sub-images)
        // Check if we need to reload comments (simple check: if called from showNextSubImage, we might want to skip)
        // But since we don't have a robust way to know 'why' we updated, we'll check if the ID changed in the comment section?
        // Actually, easiest is to pass a flag or check against current state.
        
        // Better approach: Check if the comment section already has the correct term? 
        // Utterances doesn't expose this easily.
        // Let's just reload it if 'skipComments' is false.
        // We will pass skipComments = true when navigating sub-images.

        if (!skipComments) {
            loadComments(item);
        }

        // Handle Sub-navigation UI
        if (hasMultipleImages) {
            elements.prevSubBtn.classList.remove('hidden');
            elements.nextSubBtn.classList.remove('hidden');
            elements.subIndicators.classList.remove('hidden');
            
            // Render indicators (dots)
            elements.subIndicators.innerHTML = item.images.map((_, idx) => `
                <span class="indicator ${idx === state.subImageIndex ? 'active' : ''}" data-index="${idx}"></span>
            `).join('');
            
            // Add click events to indicators
            elements.subIndicators.querySelectorAll('.indicator').forEach(ind => {
                ind.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.subImageIndex = parseInt(ind.dataset.index);
                    updateLightboxContent(true); // Skip reloading comments
                });
            });

        } else {
            elements.prevSubBtn.classList.add('hidden');
            elements.nextSubBtn.classList.add('hidden');
            elements.subIndicators.classList.add('hidden');
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
