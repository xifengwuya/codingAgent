export interface ApiService {
  callApi(prompt: string, apiKey: string): Promise<string>;
}