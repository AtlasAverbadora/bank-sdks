import type { OfertasRequestDto, OfertasResponseDto } from "../core/dto/index.js";
import type { OfertasService } from "../core/services.js";

/** Copie e troque pelo motor de crédito do banco. Recusa = `ofertas: []`. */
export class OfertasExampleImplementation implements OfertasService {
  async gerar(_request: OfertasRequestDto): Promise<OfertasResponseDto> {
    return { validade_segundos: 300, ofertas: [] };
  }
}
