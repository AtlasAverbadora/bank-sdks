import type { ContratoService } from "../core/services.js";

/** Copie se o banco trata `contrato.averbado` (averbação na folha). */
export class ContratoExampleImplementation implements ContratoService {
  async averbado(_payload: unknown): Promise<void> {}
}
