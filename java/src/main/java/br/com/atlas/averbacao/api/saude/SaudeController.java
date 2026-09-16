package br.com.atlas.averbacao.api.saude;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SaudeController {
    @Operation(summary = "Saúde do processo — sem autenticação")
    @GetMapping("/v1/saude")
    public SaudeResponse get() {
        return new SaudeResponse();
    }
}
