// How much detail to draw: 0 = the original flat look, 1 = materials,
// 2 = materials plus light and small props, 3 = real tatami layout, cast
// shadows, light beams, steam and paper grain. TEMPORARY, for comparing the
// levels side by side with ?detail=N in the URL.
const param = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('detail');
export const DETAIL = param === null ? 3 : Number(param);
