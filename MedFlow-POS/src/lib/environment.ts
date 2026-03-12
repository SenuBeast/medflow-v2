/**
 * Detect whether POS is running embedded inside MedFlow as an iframe.
 */
export const isEmbedded = (): boolean => {
    const params = new URLSearchParams(window.location.search);
    return params.get('embedded') === 'true' || window.self !== window.top;
};
