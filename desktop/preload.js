// Cầu nối an toàn giữa trang ChillSpace và máy tính: chỉ vài lệnh cho "Ứng dụng của tôi"
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  listApps: () => ipcRenderer.invoke('apps:list'),
  pickApp: () => ipcRenderer.invoke('apps:pick'),
  openApp: (id) => ipcRenderer.invoke('apps:open', String(id)),
  renameApp: (id, name) => ipcRenderer.invoke('apps:rename', String(id), String(name)),
  removeApp: (id) => ipcRenderer.invoke('apps:remove', String(id)),
  openWeb: (url, title) => ipcRenderer.invoke('web:open', String(url), String(title || '')),
});
