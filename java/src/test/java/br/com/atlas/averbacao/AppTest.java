package br.com.atlas.averbacao;

import br.com.atlas.averbacao.security.BancoKeys;
import br.com.atlas.averbacao.security.HttpSignatures;
import br.com.atlas.averbacao.security.Identity;
import br.com.atlas.averbacao.security.IdentityState;
import br.com.atlas.averbacao.security.KeyStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AppTest {
    @Autowired MockMvc mvc;
    @Autowired IdentityState identity;

    @Test
    void saudeSemAssinatura() throws Exception {
        mvc.perform(get("/v1/saude")).andExpect(status().isOk());
    }

    @Test
    void ofertasSemPareamento401() throws Exception {
        identity.setCurrent(null);
        mvc.perform(post("/v1/ofertas").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void ofertasStub501() throws Exception {
        BancoKeys atlas = KeyStore.generate();
        BancoKeys banco = KeyStore.generate();
        identity.setCurrent(new Identity(atlas.publicKey(), banco.privateKey(), banco.publicKey(), "42", banco.keyid()));
        String body = ofertasJson();
        var headers = HttpSignatures.signRequest("POST", "/v1/ofertas", body, "atlas", KeyStore.newNonce(), atlas.privateKey());
        var req = post("/v1/ofertas").contentType(MediaType.APPLICATION_JSON).content(body);
        headers.forEach((k, v) -> {
            if (!"content-type".equalsIgnoreCase(k)) req.header(k, v);
        });
        mvc.perform(req).andExpect(status().isNotImplemented());
    }

    private static String ofertasJson() {
        return "{\"correlacao_id\":\"0192f3e1-0000-7000-8000-000000000001\",\"convenio\":{\"id\":12,\"codigo\":\"CONV-1\",\"prazo_maximo_meses\":96,\"taxa_teto_am\":0.021},\"servidor\":{\"cpf\":\"12345678901\",\"matricula\":\"0001\",\"vinculo\":\"ESTATUTARIO\",\"situacao_funcional\":\"ATIVO\"},\"margem\":{\"tipo\":\"EMPRESTIMO\",\"disponivel\":800,\"total\":1700},\"solicitacao\":{\"valor_desejado\":null,\"prazo_desejado\":null}}";
    }
}
