// Minimal blendshape update module (moved into systems/)
let faceMesh = null;
let bsBarMap = {};
const blendshapesMap = {
    'browDownLeft': 'browDown_L',
    'browDownRight': 'browDown_R',
    'browInnerUp': 'browInnerUp',
    'browOuterUpLeft': 'browOuterUp_L',
    'browOuterUpRight': 'browOuterUp_R',
    'cheekPuff': 'cheekPuff',
    'cheekSquintLeft': 'cheekSquint_L',
    'cheekSquintRight': 'cheekSquint_R',
    'jawForward': 'jawForward',
    'jawLeft': 'jawLeft',
    'jawOpen': 'jawOpen',
    'jawRight': 'jawRight',
    'mouthClose': 'mouthClose',
    'mouthDimpleLeft': 'mouthDimple_L',
    'mouthDimpleRight': 'mouthDimple_R',
    'mouthFrownLeft': 'mouthFrown_L',
    'mouthFrownRight': 'mouthFrown_R',
    'mouthFunnel': 'mouthFunnel',
    'mouthLeft': 'mouthLeft',
    'mouthLowerDownLeft': 'mouthLowerDown_L',
    'mouthLowerDownRight': 'mouthLowerDown_R',
    'mouthPressLeft': 'mouthPress_L',
    'mouthPressRight': 'mouthPress_R',
    'mouthPucker': 'mouthPucker',
    'mouthRight': 'mouthRight',
    'mouthRollLower': 'mouthRollLower',
    'mouthRollUpper': 'mouthRollUpper',
    'mouthShrugLower': 'mouthShrugLower',
    'mouthShrugUpper': 'mouthShrugUpper',
    'mouthSmileLeft': 'mouthSmile_L',
    'mouthSmileRight': 'mouthSmile_R',
    'mouthStretchLeft': 'mouthStretch_L',
    'mouthStretchRight': 'mouthStretch_R',
    'mouthUpperUpLeft': 'mouthUpperUp_L',
    'mouthUpperUpRight': 'mouthUpperUp_R',
    'noseSneerLeft': 'noseSneer_L',
    'noseSneerRight': 'noseSneer_R'
};

export function initBlendshapeSystem( head, bsListElem ) {
    faceMesh = head;
    bsBarMap = {};
    if ( !bsListElem || !head || !head.morphTargetDictionary ) return;
    const bsNames = Object.keys( head.morphTargetDictionary )
        .map( k => k.replace( 'blendShape1.', '' ) )
        .filter( n => !/eye/i.test( n ) );
    bsListElem.innerHTML = '';
    for ( const name of bsNames ) {
        const row = document.createElement( 'div' );
        row.className = 'bs-row';
        const lbl = document.createElement( 'span' );
        lbl.textContent = name;
        const bg  = document.createElement( 'div' );
        bg.className = 'bs-bar-bg';
        const fill = document.createElement( 'div' );
        fill.className = 'bs-bar-fill';
        bg.appendChild( fill );
        row.appendChild( lbl );
        row.appendChild( bg );
        bsListElem.appendChild( row );
        bsBarMap[ name ] = fill;
    }
}

export function updateBlendshapes( results ) {
    if ( !faceMesh || !results || !results.faceBlendshapes || results.faceBlendshapes.length === 0 ) {
        return { faceFound: (results && results.facialTransformationMatrixes && results.facialTransformationMatrixes.length>0) };
    }

    const faceBlendshapes = results.faceBlendshapes[ 0 ].categories;

    let smileScore = 0;
    let mouthOpenScore = 0;
    let browDownScore = 0;
    let browUpScore = 0;

    for ( const blendshape of faceBlendshapes ) {
        const categoryName = blendshape.categoryName;
        const score = blendshape.score;

        if ( categoryName === 'mouthSmileLeft' || categoryName === 'mouthSmileRight' ) {
            smileScore += score;
        }
        if ( categoryName === 'jawOpen' || categoryName === 'mouthOpen' ) {
            mouthOpenScore = Math.max( mouthOpenScore, score );
        }
        if ( categoryName === 'browDownLeft' || categoryName === 'browDownRight' ) {
            browDownScore = Math.max( browDownScore, score );
        }
        if ( categoryName === 'browInnerUp' || categoryName === 'browOuterUpLeft' || categoryName === 'browOuterUpRight' ) {
            browUpScore = Math.max( browUpScore, score );
        }

        const mapped = blendshapesMap[ categoryName ];
        const index = mapped ? faceMesh.morphTargetDictionary[ mapped ] : undefined;
        if ( index !== undefined ) {
            faceMesh.morphTargetInfluences[ index ] = score;
        }

        const fill = bsBarMap[ mapped ];
        if ( fill ) fill.style.width = ( score * 100 ).toFixed( 1 ) + '%';
    }

    return {
        smileScore,
        mouthOpenScore,
        browDownScore,
        browUpScore,
        faceFound: (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length>0)
    };
}
