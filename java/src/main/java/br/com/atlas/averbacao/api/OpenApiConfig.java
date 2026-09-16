package br.com.atlas.averbacao.api;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI openApi() {
        return new OpenAPI().info(new Info()
            .title("Integração Atlas")
            .version("1")
            .description("Implemente apenas services/. Rotas, validação e assinatura já estão prontas."));
    }
}
