console.log("CHARACTER GALLERY | Successfully Loaded"); // check if alive

const MODULE_ID = "character-gallery";
const FLAG_KEY = "gallery-images";
const TOOL_ID = "gallery-tool";

const { ApplicationV2 } = foundry.applications.api;

class CharacterGalleryApp extends ApplicationV2 {
    constructor() {
        super({ window: { title: "Character Galleries" } });
        this.currentView = "list";
        this.selectedActor = null;
        this.currentImageIndex = 0;
    }

    static DEFAULT_OPTIONS = {
        tag: "div",
        classes: ["gallery-app"],
        position: { width: 700, height: 600 },
        window: {
            icon: "fas fa-images",
            resizable: true,
            contentClasses: ["standard-form"]
        }
    };

    async _renderHTML(context, options) {
        if (this.currentView === "list") {
            return this._renderCharacterList();
        } else if (this.currentView === "gallery") {
            return this._renderGalleryView();
        } else {
            return this._renderCarouselView();
        }
    }

    _renderCharacterList() {
        const playerCharacters = game.actors.filter(a => 
            a.type === "character" || a.hasPlayerOwner
        );

        if (playerCharacters.length === 0) {
            return `
                <div class="character-list-container">
                    <p class="gallery-empty">No player characters found.</p>
                </div>
            `;
        }

        const characterCards = playerCharacters.map(actor => {
            const img = actor.img || "icons/svg/mystery-man.svg";
            return `
                <div class="character-card" data-actor-id="${actor.id}">
                    <img src="${img}" class="character-card-image">
                    <div class="character-card-overlay">
                        <p class="character-card-name">${actor.name}</p>
                    </div>
                </div>
            `;
        }).join("");

        return `
            <div class="character-list-container">
                <h2 class="character-list-title">Select a Character</h2>
                <div class="character-list-scroll">
                    ${characterCards}
                </div>
            </div>
        `;
    }

    _renderGalleryView() {
        if (!this.selectedActor) return "";

        const images = this.selectedActor.getFlag(MODULE_ID, FLAG_KEY) || [];
        const isOwner = this.selectedActor.isOwner;

        const uploadBtn = isOwner ? 
            `<button type="button" class="gallery-upload-btn">
                <i class="fas fa-file-upload"></i> Upload Image
            </button>` : 
            `<p class="gallery-note">View Only Mode</p>`;

        let imageGrid = images.map((src, index) => `
            <div class="gallery-item" data-index="${index}">
                <img src="${src}" class="gallery-img" data-src="${src}">
                ${isOwner ? `
                    <i class="fas fa-trash gallery-delete" data-index="${index}"></i>
                ` : ""}
            </div>
        `).join("");

        if (images.length === 0) {
            imageGrid = `<p class="gallery-empty">No images in gallery yet.</p>`;
        }

        return `
            <div class="gallery-container">
                <div class="gallery-header">
                    <div class="gallery-header-left">
                        <button type="button" class="gallery-back-btn">
                            <i class="fas fa-arrow-left"></i> Back
                        </button>
                    </div>
                    <div class="gallery-header-center">
                        <h2 class="gallery-title">${this.selectedActor.name}'s Gallery</h2>
                    </div>
                    <div class="gallery-header-right">
                        ${uploadBtn}
                    </div>
                </div>
                <div class="gallery-grid-scroll">
                    ${imageGrid}
                </div>
            </div>
        `;
    }

    _renderCarouselView() {
        if (!this.selectedActor) return "";

        const images = this.selectedActor.getFlag(MODULE_ID, FLAG_KEY) || [];
        if (images.length === 0) return "";

        const currentImage = images[this.currentImageIndex];
        const hasPrev = this.currentImageIndex > 0;
        const hasNext = this.currentImageIndex < images.length - 1;

        const thumbnails = images.map((src, index) => `
            <div class="carousel-thumb ${index === this.currentImageIndex ? 'active' : ''}" 
                 data-index="${index}">
                <img src="${src}">
            </div>
        `).join("");

        return `
            <div class="carousel-container">
                <div class="carousel-header">
                    <button type="button" class="carousel-back-btn">
                        <i class="fas fa-arrow-left"></i> Back to Grid
                    </button>
                </div>
                
                <div class="carousel-main">
                    <img src="${currentImage}" class="carousel-image">
                    
                    ${hasPrev ? `
                        <button class="carousel-nav carousel-prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                    ` : ''}
                    
                    ${hasNext ? `
                        <button class="carousel-nav carousel-next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    ` : ''}
                </div>
                
                <div class="carousel-footer">
                    ${thumbnails}
                </div>
            </div>
        `;
    }

    _replaceHTML(result, content, options) {
        content.innerHTML = result;
        this._activateListeners(content);
    }

    _activateListeners(html) {
        if (this.currentView === "list") {
            html.querySelectorAll(".character-card").forEach(card => {
                card.addEventListener("click", (ev) => {
                    const actorId = ev.currentTarget.dataset.actorId;
                    this.selectedActor = game.actors.get(actorId);
                    this.currentView = "gallery";
                    this.render();
                });
            });
        } 
        
        else if (this.currentView === "gallery") {
            const backBtn = html.querySelector(".gallery-back-btn");
            if (backBtn) {
                backBtn.addEventListener("click", () => {
                    this.currentView = "list";
                    this.selectedActor = null;
                    this.render();
                });
            }

            const uploadBtn = html.querySelector(".gallery-upload-btn");
            if (uploadBtn) {
                uploadBtn.addEventListener("click", () => {
                    new FilePicker({
                        type: "image",
                        callback: async (path) => {
                            const currentImages = this.selectedActor.getFlag(MODULE_ID, FLAG_KEY) || [];
                            await this.selectedActor.setFlag(MODULE_ID, FLAG_KEY, [...currentImages, path]);
                            this.render();
                        }
                    }).render(true);
                });
            }

            html.querySelectorAll(".gallery-delete").forEach(btn => {
                btn.addEventListener("click", async (ev) => {
                    ev.stopPropagation();
                    const index = parseInt(ev.target.dataset.index);
                    const currentImages = this.selectedActor.getFlag(MODULE_ID, FLAG_KEY) || [];
                    currentImages.splice(index, 1);
                    await this.selectedActor.setFlag(MODULE_ID, FLAG_KEY, currentImages);
                    this.render();
                });
            });

            html.querySelectorAll(".gallery-item").forEach(item => {
                item.addEventListener("click", (ev) => {
                    if (ev.target.classList.contains("gallery-delete")) return;
                    
                    const index = parseInt(ev.currentTarget.dataset.index);
                    this.currentImageIndex = index;
                    this.currentView = "carousel";
                    this.render();
                });
            });
        }
        
        else if (this.currentView === "carousel") {
            const backBtn = html.querySelector(".carousel-back-btn");
            if (backBtn) {
                backBtn.addEventListener("click", () => {
                    this.currentView = "gallery";
                    this.render();
                });
            }

            const prevBtn = html.querySelector(".carousel-prev");
            if (prevBtn) {
                prevBtn.addEventListener("click", () => {
                    this.currentImageIndex--;
                    this.render();
                });
            }

            const nextBtn = html.querySelector(".carousel-next");
            if (nextBtn) {
                nextBtn.addEventListener("click", () => {
                    this.currentImageIndex++;
                    this.render();
                });
            }

            html.querySelectorAll(".carousel-thumb").forEach(thumb => {
                thumb.addEventListener("click", (ev) => {
                    const index = parseInt(ev.currentTarget.dataset.index);
                    this.currentImageIndex = index;
                    this.render();
                });
            });
        }
    }
}

// inject css
Hooks.once("init", () => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "modules/token-gallery/styles.css";
    document.head.appendChild(link);
});

// the pop-up trigger
Hooks.on("getSceneControlButtons", (controls) => {
    const tokenLayer = controls.token || controls.tokens;
    if (!tokenLayer) return;

    const existingTools = Object.keys(tokenLayer.tools).length;

    tokenLayer.tools[TOOL_ID] = {
        name: TOOL_ID,
        title: "Character Galleries",
        icon: "fas fa-images",
        button: true,
        order: existingTools + 1,
        onClick: () => {
            new CharacterGalleryApp().render(true);
        }
    };
});
