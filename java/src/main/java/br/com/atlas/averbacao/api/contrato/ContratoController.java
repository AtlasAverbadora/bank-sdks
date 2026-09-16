package br.com.atlas.averbacao.api.contrato;

import br.com.atlas.averbacao.api.contratacao.OkResponse;
import br.com.atlas.averbacao.services.contrato.ContratoContract;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContratoController {
    private final ContratoContract contrato;

    public ContratoController(ContratoContract contrato) {
        this.contrato = contrato;
    }

    @Operation(summary = "O contrato foi averbado na folha")
    @PostMapping("/v1/contratos/averbados")
    public OkResponse post(@Valid @RequestBody ContratoAverbadoRequest request) {
        contrato.averbado(request);
        return new OkResponse();
    }
}
