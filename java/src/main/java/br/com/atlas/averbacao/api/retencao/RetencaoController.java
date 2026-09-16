package br.com.atlas.averbacao.api.retencao;

import br.com.atlas.averbacao.api.contratacao.OkResponse;
import br.com.atlas.averbacao.services.retencao.RetencaoContract;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RetencaoController {
    private final RetencaoContract retencao;

    public RetencaoController(RetencaoContract retencao) {
        this.retencao = retencao;
    }

    @Operation(summary = "Abriu uma oportunidade de retenção (Modo Defesa)")
    @PostMapping("/v1/retencao/oportunidades")
    public OkResponse post(@Valid @RequestBody RetencaoOportunidadeRequest request) {
        retencao.oportunidadeAberta(request);
        return new OkResponse();
    }
}
