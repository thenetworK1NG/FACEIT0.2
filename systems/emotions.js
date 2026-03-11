// Lightweight emotion scoring and badge toggles (moved into systems/)
let smileBadge, mouthBadge, angryBadge, surprisedBadge, neutralBadge, faceBadge;
let faceDetectedFrames = 0;
let smileDetectedFrames = 0;
let mouthOpenFrames = 0;
let angerFrames = 0;
let surpriseFrames = 0;
let neutralFrames = 0;

export function initEmotionSystem( els = {} ) {
    smileBadge = els.smileBadge || null;
    mouthBadge = els.mouthBadge || null;
    angryBadge = els.angryBadge || null;
    surprisedBadge = els.surprisedBadge || null;
    neutralBadge = els.neutralBadge || null;
    faceBadge = els.faceBadge || null;
}

export function updateEmotions( scores = {} ) {
    const { faceFound, smileScore = 0, mouthOpenScore = 0, browDownScore = 0, browUpScore = 0 } = scores;

    if ( faceFound ) {
        faceDetectedFrames = 10;
    } else {
        faceDetectedFrames = Math.max( 0, faceDetectedFrames - 1 );
    }
    if ( faceBadge ) faceBadge.classList.toggle( 'visible', faceDetectedFrames > 0 );

    if ( smileScore > 0.6 ) {
        smileDetectedFrames = 10;
    } else {
        smileDetectedFrames = Math.max( 0, smileDetectedFrames - 1 );
    }
    if ( smileBadge ) smileBadge.classList.toggle( 'visible', smileDetectedFrames > 0 );

    if ( mouthOpenScore > 0.35 ) {
        mouthOpenFrames = 10;
    } else {
        mouthOpenFrames = Math.max( 0, mouthOpenFrames - 1 );
    }
    if ( mouthBadge ) mouthBadge.classList.toggle( 'visible', mouthOpenFrames > 0 );

    if ( browDownScore > 0.45 ) {
        angerFrames = 10;
    } else {
        angerFrames = Math.max( 0, angerFrames - 1 );
    }
    if ( angryBadge ) angryBadge.classList.toggle( 'visible', angerFrames > 0 );

    if ( browUpScore > 0.45 ) {
        surpriseFrames = 10;
    } else {
        surpriseFrames = Math.max( 0, surpriseFrames - 1 );
    }
    if ( surprisedBadge ) surprisedBadge.classList.toggle( 'visible', surpriseFrames > 0 );

    if ( faceDetectedFrames > 0 && smileDetectedFrames === 0 && mouthOpenFrames === 0 && angerFrames === 0 && surpriseFrames === 0 ) {
        neutralFrames = 10;
    } else {
        neutralFrames = Math.max( 0, neutralFrames - 1 );
    }
    if ( neutralBadge ) neutralBadge.classList.toggle( 'visible', neutralFrames > 0 );
}
