using Atlas.Averbacao.Api.Saude;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api.Saude;

[ApiController]
[Route("v1/saude")]
public sealed class SaudeController : ControllerBase
{
    /// <summary>Saúde do processo — sem autenticação.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(SaudeResponse), 200)]
    public SaudeResponse Get() => new();
}
