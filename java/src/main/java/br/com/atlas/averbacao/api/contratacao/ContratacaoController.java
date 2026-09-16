package br.com.atlas.averbacao.api.contratacao;

import br.com.atlas.averbacao.services.contratacao.ContratacaoContract;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContratacaoController {
    private final ContratacaoContract contratacao;

    public ContratacaoController(ContratacaoContract contratacao) {
        this.contratacao = contratacao;
    }

    @Operation(summary = "Uma oferta sua foi escolhida — confirme no seu core")
    @PostMapping("/v1/contratacoes")
    public OkResponse post(@Valid @RequestBody ContratacaoRequest request) {
        contratacao.iniciada(request);
        return new OkResponse();
    }
}
