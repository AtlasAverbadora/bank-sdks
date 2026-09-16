using Atlas.Averbacao.Api.Contratacao;
using Atlas.Averbacao.Api.Contrato;
using Atlas.Averbacao.Services.Contrato;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api.Contrato;

[ApiController]
[Route("v1/contratos/averbados")]
public sealed class ContratoController(IContratoService contrato) : ControllerBase
{
    /// <summary>O contrato foi averbado na folha.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(OkResponse), 200)]
    public async Task<OkResponse> Post([FromBody] ContratoAverbadoRequest request)
    {
        await contrato.Averbado(request);
        return new OkResponse();
    }
}
