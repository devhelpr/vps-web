import { Theme } from '../interfaces/theme';

export const standardTheme: Theme = {
  name: 'Standard',
  background: 'bg-slate-800',
  backgroundAsHexColor: '#1e293b',
  nodeBackground: 'bg-slate-500',
  nodeTitleBarBackground: 'bg-slate-600',
  nodeTitleBarText: 'text-white',
  nodeText: 'text-white',
  compositionBackground: 'bg-purple-500',
  compositionText: 'white',
  connectionColor: 'bg-white-500',
  arrowColor: 'bg-white',
  thumbColor: 'bg-white',
  selectNodeBorderColor: 'bg-blue-500',
  selectConnectionColor: 'bg-blue-500',
  selectThumbColor: 'bg-blue-500',
  compositionThumbInputNodeBackground: 'bg-green-500',
  compositionThumbInputNodeText: 'text-black',
  compositionThumbOutputNodeBackground: 'bg-red-500',
  compositionThumbOutputNodeText: 'text-black',
};
