import type { DataService } from "./contract";
import { MockDataService } from "./mock-service";
// Ponto de composição. Uma futura implementação HTTP poderá substituir o adaptador,
// mantendo modelos, regras de apresentação e componentes separados do transporte.
export function createDataService(): DataService {
  return new MockDataService();
}
