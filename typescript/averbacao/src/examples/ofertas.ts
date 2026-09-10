import type { OfertasRequestDto, OfertasResponseDto } from "../core/dto/index.js";
import type { OfertasService } from "../core/services.js";

/** Copie e troque pelo motor de crédito do banco. Recusa = `ofertas: []`. */
export class OfertasExampleImplementation implements OfertasService {
  async gerar(request: OfertasRequestDto): Promise<OfertasResponseDto> {
    void request;
    return { validade_segundos: 300, ofertas: [] };
  }
}
