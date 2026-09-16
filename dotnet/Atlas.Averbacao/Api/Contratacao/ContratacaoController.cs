using Atlas.Averbacao.Api.Contratacao;
using Atlas.Averbacao.Services.Contratacao;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api.Contratacao;

[ApiController]
[Route("v1/contratacoes")]
public sealed class ContratacaoController(IContratacaoService contratacao) : ControllerBase
{
    /// <summary>Uma oferta sua foi escolhida — confirme no seu core.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(OkResponse), 200)]
    public async Task<OkResponse> Post([FromBody] ContratacaoRequest request)
    {
        await contratacao.Iniciada(request);
        return new OkResponse();
    }
}
