// Prompts (props) UI system: populates the Side panel with prop models
export function initPromptsSystem({ getModelsData = () => [], getLoadMaskModel = () => null, sidePanel = null, btnId = 'btn-prompts', contentId = 'side-content', titleId = 'side-title', closeId = 'side-close' } = {}) {
    const btnPrompts = document.getElementById( btnId );
    const sideContent = document.getElementById( contentId );
    const sideTitle = document.getElementById( titleId );
    const sideClose = document.getElementById( closeId );

    if ( !btnPrompts ) return;

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
            console.debug( 'prompts-system: models.json not loaded or invalid', e );
            modelsData = [];
        }

        // Populate legacy `props-select` if present
        try {
            const propsSelect = document.getElementById( 'props-select' );
            if ( propsSelect ) {
                propsSelect.innerHTML = '';
                for ( const m of modelsData ) {
                    if ( typeof m.file === 'string' && m.file.indexOf( 'props/' ) !== -1 ) {
                        const opt = document.createElement( 'option' );
                        opt.value = m.file;
                        opt.textContent = m.name || m.file;
                        propsSelect.appendChild( opt );
                    }
                }
            }
        } catch ( e ) { /* silent */ }
    }

    loadModelsData();

    // Wire legacy props button if present (keeps backward compatibility)
    try {
        const btnAddProp = document.getElementById( 'btn-add-prop' );
        const propsSelect = document.getElementById( 'props-select' );
        if ( btnAddProp ) {
            btnAddProp.addEventListener( 'click', () => {
                const path = propsSelect ? propsSelect.value : null;
                if ( !path ) return;
                const loader = getLoadMaskModel();
                if ( typeof loader === 'function' ) {
                    loader( path, true );
                } else {
                    console.warn( 'Mask loader not initialized yet; try again after the face model finishes loading.' );
                }
            } );
        }
    } catch ( e ) { /* silent */ }

    function populatePrompts() {
        if ( !sideContent ) return;
        sideContent.innerHTML = '';
        const list = document.createElement( 'div' );
        list.className = 'side-list';

        const items = Array.isArray( modelsData ) ? modelsData.filter( m => typeof m.file === 'string' && m.file.indexOf( 'props/' ) !== -1 ) : [];

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
                        loader( m.file, true );
                    } else {
                        console.warn( 'Mask loader not initialized yet; try again after the face model finishes loading.' );
                    }
                } );
                list.appendChild( b );
            }
        }

        sideContent.appendChild( list );
    }

    btnPrompts.addEventListener( 'click', () => {
        if ( sideTitle ) sideTitle.textContent = 'Prompts';
        populatePrompts();
        if ( sidePanel && sidePanel.classList ) sidePanel.classList.add( 'open' );
    } );

    if ( sideClose ) sideClose.addEventListener( 'click', () => sidePanel.classList.remove( 'open' ) );
}
