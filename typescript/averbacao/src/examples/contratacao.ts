import type { ContratacaoNotificacaoDto } from "../core/dto/index.js";
import type { ContratacaoService } from "../core/services.js";

/** Copie se o banco consome `POST /contratacoes`. */
export class ContratacaoExampleImplementation implements ContratacaoService {
  async iniciada(payload: ContratacaoNotificacaoDto): Promise<void> {
    void payload;
  }
}
