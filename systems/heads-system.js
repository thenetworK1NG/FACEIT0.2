// Heads UI system: populates the Side panel with non-prop (head) models
export function initHeadsSystem({ getModelsData = () => [], getLoadMaskModel = () => null, sidePanel = null, btnId = 'btn-heads', contentId = 'side-content', titleId = 'side-title', closeId = 'side-close' } = {}) {
    const btnHeads = document.getElementById( btnId );
    const sideContent = document.getElementById( contentId );
    const sideTitle = document.getElementById( titleId );
    const sideClose = document.getElementById( closeId );

    if ( !btnHeads ) return;
    // Internal models cache (systems now load `models.json` so index.html can be minimal)
    let modelsData = [];

    async function loadModelsData() {
        try {
            const fromGetter = Array.isArray( getModelsData() ) ? getModelsData() : null;
            if ( fromGetter && fromGetter.length ) {
                modelsData = fromGetter;
            } else {
                const res = await fetch( 'models.json' );
                const data = await res.json();
                modelsData = Array.isArray( data.models ) ? data.models : ( Array.isArray( data ) ? data : [] );
            }
        } catch ( e ) {
            console.debug( 'heads-system: models.json not loaded or invalid', e );
            modelsData = [];
        }

        // Populate legacy `model-select` if present
        try {
            const modelSelect = document.getElementById( 'model-select' );
            if ( modelSelect ) {
                modelSelect.innerHTML = '';
                for ( const m of modelsData ) {
                    if ( typeof m.file === 'string' && m.file.indexOf( 'props/' ) === -1 ) {
                        const opt = document.createElement( 'option' );
                        opt.value = m.file;
                        opt.textContent = m.name || m.file;
                        modelSelect.appendChild( opt );
                    }
                }
            }
        } catch ( e ) { /* silent */ }
    }

    loadModelsData();

    // Wire legacy load button if present (keeps backward compatibility)
    try {
        const btnLoadModel = document.getElementById( 'btn-load-model' );
        const modelSelect = document.getElementById( 'model-select' );
        if ( btnLoadModel ) {
            btnLoadModel.addEventListener( 'click', () => {
                const path = modelSelect ? modelSelect.value : null;
                if ( !path ) return;
                const loader = getLoadMaskModel();
                if ( typeof loader === 'function' ) {
                    loader( path, false );
                } else {
                    console.warn( 'Mask loader not initialized yet; try again after the face model finishes loading.' );
                }
            } );
        }
    } catch ( e ) { /* silent */ }

    function populateHeads() {
        if ( !sideContent ) return;
        sideContent.innerHTML = '';
        const list = document.createElement( 'div' );
        list.className = 'side-list';

        const items = Array.isArray( modelsData ) ? modelsData.filter( m => !( typeof m.file === 'string' && m.file.indexOf( 'props/' ) !== -1 ) ) : [];

        if ( items.length === 0 ) {
            const p = document.createElement( 'div' );
            p.style.color = 'var(--text-dim)';
            p.style.padding = '8px 4px';
            p.textContent = 'No items found.';
            list.appendChild( p );
        } else {
            for ( const m of items ) {
                const b = document.createElement( 'button' );
                b.className = 'menu-item';
                b.textContent = m.name || m.file;
                b.addEventListener( 'click', () => {
                    const loader = getLoadMaskModel();
                    if ( typeof loader === 'function' ) {
                        loader( m.file, false );
                    } else {
                        console.warn( 'Mask loader not initialized yet; try again after the face model finishes loading.' );
                    }
                } );
                list.appendChild( b );
            }
        }

        sideContent.appendChild( list );
    }

    btnHeads.addEventListener( 'click', async () => {
        if ( sideTitle ) sideTitle.textContent = 'Heads';
        await loadModelsData();
        populateHeads();
        if ( sidePanel && sidePanel.classList ) sidePanel.classList.add( 'open' );
    } );

    if ( sideClose ) sideClose.addEventListener( 'click', () => sidePanel.classList.remove( 'open' ) );
}
