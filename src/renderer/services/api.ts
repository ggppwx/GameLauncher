import { ElectronAPI } from '../types/electron';

export class ApiClient {
  async invoke<T = any>(method: keyof ElectronAPI, ...args: any[]): Promise<T> {
    try {
      if (!(method in window.electronAPI)) {
        throw new Error(`Method ${method} not found in ElectronAPI`);
      }

      const methodFn = window.electronAPI[method] as Function;
      if (typeof methodFn !== 'function') {
        throw new Error(`${method} is not a function`);
      }

      return await methodFn.apply(window.electronAPI, args);
    } catch (error) {
      console.error(`Error calling ${method}:`, error);
      throw error;
    }
  }

  onScanProgress(callback: (event: any, data: any) => void): void {
    window.electronAPI.onScanProgress(callback);
  }

  removeScanProgressListener(): void {
    window.electronAPI.removeScanProgressListener();
  }
}

export const apiClient = new ApiClient();
