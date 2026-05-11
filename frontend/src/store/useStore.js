import { create } from 'zustand';
import { servers as serversApi } from '../api/client';

const useStore = create((set, get) => ({
  servers: [],
  activeServerId: null,
  loading: false,

  setServers: (servers) => set({ servers }),

  setActiveServer: (id) => set({ activeServerId: id }),

  fetchServers: async () => {
    set({ loading: true });
    try {
      const data = await serversApi.list();
      set({ servers: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      set({ loading: false });
    }
  },

  addServer: (server) => set(state => ({ servers: [...state.servers, server] })),

  updateServer: (id, updates) => set(state => ({
    servers: state.servers.map(s => s.id === id ? { ...s, ...updates } : s),
  })),

  removeServer: (id) => set(state => ({
    servers: state.servers.filter(s => s.id !== id),
    activeServerId: state.activeServerId === id ? null : state.activeServerId,
  })),

  getServer: (id) => get().servers.find(s => s.id === id),
}));

export default useStore;
