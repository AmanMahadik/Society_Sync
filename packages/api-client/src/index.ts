import type { ComplaintTicket, SOSAlertPayload, BuildingHealthScore } from '@societysync/types';

/**
 * Enterprise API Client for SocietySync
 */
export class SocietySyncApiClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { baseUrl: string; apiKey?: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'apikey': this.apiKey, 'Authorization': `Bearer ${this.apiKey}` } : {}),
      ...options.headers
    };

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      throw new Error(`API error [${res.status}]: ${await res.text()}`);
    }

    return res.json() as Promise<T>;
  }

  async getBuildingHealthScore(societyId: string): Promise<BuildingHealthScore> {
    return this.request<BuildingHealthScore>(`/api/v1/societies/${societyId}/health-score`);
  }

  async createTicket(ticket: Partial<ComplaintTicket>): Promise<ComplaintTicket> {
    return this.request<ComplaintTicket>('/api/v1/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket)
    });
  }

  async triggerSOS(payload: Partial<SOSAlertPayload>): Promise<{ success: boolean; alert_id: string }> {
    return this.request<{ success: boolean; alert_id: string }>('/api/v1/sos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
