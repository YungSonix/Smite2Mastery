/**
 * Public chart entry — Metro resolves `./BuildStatChartPanel` to
 * `BuildStatChartPanel.web.jsx` on web and `.native.jsx` on iOS/Android.
 * Do not require both panels in one file (pulls react-native-svg into web).
 */
export { resolveChartIconUri } from './buildStatChartConfig';

const mod = require('./BuildStatChartPanel');

export const BuildStatChartModal = mod.BuildStatChartModal;
export default mod.default;
