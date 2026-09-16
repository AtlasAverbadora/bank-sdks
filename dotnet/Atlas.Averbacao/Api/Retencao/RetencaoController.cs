using Atlas.Averbacao.Api.Contratacao;
using Atlas.Averbacao.Api.Retencao;
using Atlas.Averbacao.Services.Retencao;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api.Retencao;

[ApiController]
[Route("v1/retencao/oportunidades")]
public sealed class RetencaoController(IRetencaoService retencao) : ControllerBase
{
    /// <summary>Abriu uma oportunidade de retenção (Modo Defesa).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(OkResponse), 200)]
    public async Task<OkResponse> Post([FromBody] RetencaoOportunidadeRequest request)
    {
        await retencao.OportunidadeAberta(request);
        return new OkResponse();
    }
}
